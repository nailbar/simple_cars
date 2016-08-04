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
    
    // Collision avoidance
    this.nearest = [];
    this.next = 0;
    
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
        
        // Target is other car to avoid
        if(this.follow_mode == 2) {
            t.near_distance = 1000000;
            for(var i = 0; i < this.nearest.length; i++) if(this.nearest[i].distance < t.near_distance) {
                t.relative_target = this.nearest[i].relative;
                t.near_distance = this.nearest[i].distance;
            }
        
        // Target is waypoint
        } else t.relative_target = {
            'x': this.waypoints[0].x - this.x,
            'y': this.waypoints[0].y - this.y
        };
        
        // Check which side target is on
        
        t.front_target = t.relative_target.x * this.normal.x + t.relative_target.y * this.normal.y;
        t.right_target = t.relative_target.x * this.right_normal.x + t.relative_target.y * this.right_normal.y;
        
        // Next waypoint
        if(this.follow_mode != 2) {
            if(this.waypoints.length == 1) {
                if(Math.max(Math.abs(t.front_target), Math.abs(t.right_target)) < 5.0 && Math.abs(this.v) < 2.0) this.waypoints.splice(0, 1);
            } else if(Math.max(Math.abs(t.front_target), Math.abs(t.right_target)) < 100.0) this.waypoints.splice(0, 1);
        }
        
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
            
            // Collision avoidance
            case 2:
                    
                // Turn wheels away from target
                t.w = (t.right_target > 0 ? -1.0 : 1.0);
                t.v = 0.1;
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
        
        // Debug nearest
        if(w.debug) for(var i = 0; i < this.nearest.length; i++) {
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(this.nearest[i].relative.x, this.nearest[i].relative.y);
            c.stroke();
        }
        c.rotate(this.d * Math.PI * 2.0);
        
        // Mark car
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
        
        // Debug waypoints
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
    
    /**
     * Update list of nearest cars
     */
    this.find_nearest = function(cars, self_id) {
        var v = {};
        if(this.follow_mode == 2) this.follow_mode = 0;
        if(!this.normal) return;
        
        // Update values for current list
        for(var i = 0; i < this.nearest.length; i++) {
            
            // Remove illegal ids
            if(this.nearest[i].id >= cars.length || this.nearest[i].id == self_id) {
                this.nearest.splice(i, 1);
                i--;
            } else {
                
                // Recalculate
                this.nearest[i] = this.get_nearness(cars[this.nearest[i].id], this.nearest[i].id);
                
                // Go into collision avoidance mode if too near
                if(this.nearest[i].distance < 30.0 + this.v) this.follow_mode = 2;
            }
        }
        
        // Check for nearer
        for(var i = 0; i < 3; i++) {
            if(this.next >= cars.length) this.next = 0;
            
            // Compare this car with the current list and replace the furthest away if this one is closer
            if(this.next != self_id && this.next < cars.length) {
                v.next_near = this.get_nearness(cars[this.next], this.next);
                v.add_next = this.nearest.length < 5;
                v.remove_id = -1;
                if(!v.add_next) for(var i = 0; i < this.nearest.length; i++) {
                    
                    // Prevent adding the same car twice
                    if(this.nearest[i].id == v.next_near.id) {
                        v.add_next = false;
                        v.remove_id = -1;
                        break;
                    
                    // Find car to remove in place of the new one
                    } else if(this.nearest[i].distance > v.next_near.distance) {
                        v.add_next = true;
                        if(v.remove_id < 0) v.remove_id = i;
                        else if(this.nearest[v.remove_id].distance < this.nearest[i].distance) v.remove_id = i;
                    }
                }
                
                // Remove old
                if(v.remove_id > -1) this.nearest.splice(v.remove_id, 1);
                
                // Add new
                if(v.add_next) {
                    this.nearest.push(v.next_near);
                    
                    // Go into collision avoidance mode if too near
                    if(v.next_near.distance < 50.0 + this.v * 10.0) this.follow_mode = 2;
                }
            }
            this.next++;
        }
    }
    
    /**
     * Helper for calculating nearest cars
     */
    this.get_nearness = function(car, car_id) {
        var near = {};
        near.id = car_id;
        
        // Quick and dirty distance calculation
        near.relative = {
//             'x': car.x - (this.x + this.normal.x * this.v),
//             'y': car.y - (this.y + this.normal.y * this.v)
            'x': car.x - this.x,
            'y': car.y - this.y
        };
        near.distance = near.relative.x * near.relative.x + near.relative.y * near.relative.y;
        return near;
    }
}
