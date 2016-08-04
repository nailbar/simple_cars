function simple_car(x, y, d) {
    
    // Position and state
    this.x = x;
    this.y = y;
    this.d = d; // Direction
    this.w = 0.0; // Wheel direction
    this.v = 0.0; // Velocity
    
    // Control state
    this.tv = 0.0; // Target velocity
    this.tw = 0.0; // Target wheel
    
    // Color
    this.r = Math.random();
    this.g = Math.random();
    this.b = Math.random();
    
    // Waypoints
    this.waypoints = [];
    this.follow_mode = 0;
    
    /**
     * Follow waypoints
     */
    this.follow = function(f) {
        var t = {}; // Temporary vars
        
        // Skip if no waypoints or no position data
        if(!this.waypoints.length) return this.change(f, {});
        if(!this.normal) return this.change(f, {});
        
        // Get right hand normal
        this.right_normal = {
            'x': Math.cos((this.d + 0.25) * Math.PI * 2.0),
            'y': Math.sin((this.d + 0.25) * Math.PI * 2.0)
        };
        
        // Check which side target is on
        t.relative_target = {
            'x': this.waypoints[0].x - this.x,
            'y': this.waypoints[0].y - this.y
        };
        t.front_target = t.relative_target.x * this.normal.x + t.relative_target.y * this.normal.y;
        t.right_target = t.relative_target.x * this.right_normal.x + t.relative_target.y * this.right_normal.y;
        
        // Next waypoint
        if(this.waypoints.length == 1) {
            if(Math.max(Math.abs(t.front_target), Math.abs(t.right_target)) < 5.0 && Math.abs(this.v) < 2.0) this.waypoints.splice(0, 1);
        } else if(Math.max(Math.abs(t.front_target), Math.abs(t.right_target)) < 100.0) this.waypoints.splice(0, 1);
        
        // Follow target depending on mode
        switch(this.follow_mode) {
            
            // Drive towards target
            case 0:
                if(t.front_target < 0 && t.front_target * t.front_target + t.right_target * t.right_target < 10000.0) this.follow_mode = 1;
                else {
                    
                    // Turn wheels towards target
                    t.w = (t.right_target < 0 ? -1.0 : 1.0);
                    if(Math.abs(t.right_target) < t.front_target && t.front_target > 0) {
                        t.w *= Math.abs(t.right_target / t.front_target);
                    }
                    
                    // Accelerate towards target, break in time
                    if(t.front_target < t.right_target || t.front_target < 0) t.v = 1.0;
                    else if(this.waypoints.length > 1) t.v = Math.max(-0.5, Math.min(1.0, (t.front_target - this.v) / 100.0));
                    else t.v = Math.max(-0.5, Math.min(1.0, (t.front_target - this.v) / 300.0));
                    t.v *= 1.0 - Math.abs(t.w) * 0.9;
                    
                    // Some slight adjustment
                    if(Math.abs(t.right_target) > 5.0) t.v = Math.max(0.1, t.v);
                }
                break;
                
            // Back up until facing target
            case 1:
                if(t.front_target > 0 && Math.abs(t.right_target) / t.front_target < 0.1 && Math.abs(this.v) < 25.0) this.follow_mode = 0;
                else {
                    
                    // Turn wheels away from target
                    t.w = (t.right_target > 0 ? -1.0 : 1.0);
                    if(t.right_target < t.front_target) t.w *= Math.abs(t.right_target / t.front_target);
                    
                    // Reverse until facing target
                    if(t.front_target < t.right_target) t.v = -0.2;
                    else t.v = -0.2 * Math.abs(t.right_target / t.front_target);
                }
                break;
                
        }
        this.change(f, t);
    }
    
    /**
     * Change car state
     */
    this.change = function(f, t) {
        
        // Sanity checks
        var v = (t.v ? Math.min(1.0, Math.max(-0.5, t.v)) : 0);
        var w = (t.w ? Math.min(1.0, Math.max(-1.0, t.w)) : 0);
        
        // Car velocity
        if(this.v > 0 && v <= 0) this.v -= 70.0 * f;
        else if(this.v < 0 && v >= 0) this.v += 70.0 * f;
        else this.v += (v * 300.0 - this.v) * 1.2 * f;
        
        // Velocity affects max wheel direction
        if(Math.abs(this.v) > 350.0) w = 0;
        else w *= (1.0 - Math.abs(this.v / 350.0));
        
        // Car wheels
        if(Math.abs(this.w) < f && w == 0) this.w -= this.w * f;
        else if(w > this.w) this.w += 2.0 * f;
        else this.w -= 2.0 * f;
    }
    
    /**
     * Move the car
     */
    this.move = function(f) {
        
        // Optimization: Don't move the car the first frame, this way we have the latest up-to-date values after the car is moved
        if(this.normal) {
            
            // Get new axel positions
            this.axel_front = {
                'x': this.x + this.normal.x * 8.0 + this.wheel_normal.x * this.v * f,
                'y': this.y + this.normal.y * 8.0 + this.wheel_normal.y * this.v * f
            }
            this.axel_rear = {
                'x': this.x - this.normal.x * 8.0 + this.normal.x * this.v * f,
                'y': this.y - this.normal.y * 8.0 + this.normal.y * this.v * f
            }
            
            // Get new car position
            this.x = (this.axel_front.x + this.axel_rear.x) / 2.0;
            this.y = (this.axel_front.y + this.axel_rear.y) / 2.0;
            
            // Get new car direction
            this.d = Math.atan2(this.axel_front.y - this.axel_rear.y, this.axel_front.x - this.axel_rear.x) / (Math.PI * 2.0);
        }
        
        // Get car normal
        this.normal = {
            'x': Math.cos(this.d * Math.PI * 2.0),
            'y': Math.sin(this.d * Math.PI * 2.0)
        };
        
        // Get wheel normal
        this.wheel_normal = {
            'x': Math.cos((this.d + this.w * 0.125) * Math.PI * 2.0),
            'y': Math.sin((this.d + this.w * 0.125) * Math.PI * 2.0)
        }
    }
    
    /**
     * Draw the car
     */
    this.draw = function(c, x, y) {
        
        // Position car
        c.save();
        c.translate(x, y);
        c.rotate(this.d * Math.PI * 2.0);
        if(w.debug) c.strokeRect(-20, -20, 40, 40);
        
        // Draw wheels
        c.fillStyle = "rgb(0,0,0)";
        c.save();
        c.translate(-8, -6);
        c.fillRect(-4, -1, 8, 2);
        c.translate(0, 12);
        c.fillRect(-4, -1, 8, 2);
        c.translate(16, 0);
        c.save();
        c.rotate(this.w * Math.PI * 0.25);
        c.fillRect(-4, -1, 8, 2);
        c.restore();
        c.translate(0, -12);
        c.rotate(this.w * Math.PI * 0.25);
        c.fillRect(-4, -1, 8, 2);
        c.restore();
        
        // Draw car
        c.fillRect(-12, -4, 24, 8);
        c.fillStyle = "rgb(" + Math.floor(this.r * 255.9) + "," + Math.floor(this.g * 255.9) + "," + Math.floor(this.b * 255.9) + ")";
        c.fillRect(-11, -3, 3, 6);
        c.fillRect(0, -3, 11, 6);
        c.restore();
        
//         if(this.waypoints.length) {
//             c.beginPath();
//             c.moveTo(w.canvas.width * 0.5 + this.x, w.canvas.height * 0.5 + this.y);
//             c.lineTo(w.canvas.width * 0.5 + this.waypoints[0].x, w.canvas.height * 0.5 + this.waypoints[0].y);
//             c.stroke();
//         }
    }
    
    /**
     * Add a waypoint
     */
    this.add_waypoint = function(x, y) {
        this.waypoints.push({x, y});
    }
}
