/**
 * mapService.js - Adapted for Vanilla JS
 * Handles Graph Loading, BFS Pathfinding, and 3D Coordinate Generation.
 */

const MapService = {
    graph: null,
    mapData: null,
    ROOM_WIDTH: 5, // Meters per node (Approximation)

    // Load the JSON map data
    async loadMap() {
        try {
            const res = await fetch("block_c_map.json");
            this.mapData = await res.json();
            this.graph = this.mapData.nodes;
            console.log("Map Loaded:", this.graph);
            return this.mapData;
        } catch (e) {
            console.error("Failed to load map:", e);
            return null;
        }
    },

    // BFS shortest path (Node Name -> Node Name)
    bfs(start, end) {
        if (!this.graph) return null;
        start = start.toLowerCase();
        end = end.toLowerCase();

        if (!this.graph[start] || !this.graph[end]) return null;

        const queue = [[start]];
        const visited = new Set();
        visited.add(start);

        while (queue.length > 0) {
            const path = queue.shift();
            const node = path[path.length - 1];

            if (node === end) return path;

            if (this.graph[node] && this.graph[node].neighbors) {
                for (let neighbor of this.graph[node].neighbors) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push([...path, neighbor]);
                    }
                }
            }
        }
        return null;
    },

    // COORDINATE MAPPING (Visual Layout of Block C)
    // Scale: 1 unit = 1 meter
    // Layout: U-Shape
    // Right Corridor (Vertical): x=0, z runs 0 to 40
    // Top Corridor (Horizontal): z=40, x runs 0 to -20
    // Left Corridor (Vertical): x=-20, z runs 40 to 10
    
    nodeCoordinates: {
        // --- Right Wing ---
        "c201": { x: 2, z: 0 },   "corridor_right_start": { x: 0, z: 0 },
        "c202": { x: 2, z: 5 },
        "c203": { x: 2, z: 10 },
        "c204": { x: 2, z: 15 },
        "c205": { x: 2, z: 20 },
        "c206": { x: 2, z: 25 },
        "c207": { x: 2, z: 30 },
        "c208": { x: 2, z: 35 },
        "corridor_right": { x: 0, z: 20 }, // Midpoint of right corridor

        // --- Top Wing ---
        "c209": { x: -5, z: 42 },
        "c210": { x: -10, z: 42 },
        "staircase_3": { x: -15, z: 45 },
        "corridor_top": { x: -10, z: 40 }, // Midpoint

        // --- Left Wing ---
        "c211": { x: -22, z: 35 },
        "c212": { x: -22, z: 30 },
        "c213": { x: -22, z: 25 },
        "c214": { x: -22, z: 20 },
        "corridor_left": { x: -20, z: 25 } // Midpoint
    },

    // Interpolate logical path to physical coordinates
    generatePathCoordinates(path) {
        if (!path || path.length === 0) return [];
        let points = [];

        // 1. Get Coordinates for all nodes in path
        // We use the "start" of the path as the Local Origin (0,0,0) offset
        const startNodeName = path[0];
        const startCoord = this.getNodeCoordinate(startNodeName);

        for (let i = 0; i < path.length; i++) {
            let nodeName = path[i];
            let coord = this.getNodeCoordinate(nodeName);

            // Transform to Local Space (Relative to Start)
            // AR.js Camera is at (0,0,0) facing Negative Z
            // So:
            // Local X = (Global X - Start X)
            // Local Z = (Global Z - Start Z) * -1  (Because "Forward" in WebVR is -Z)
            
            let localPoint = {
                x: coord.x - startCoord.x,
                y: 0, // Floor level (handled by parent entity y=-1.6)
                z: -(coord.z - startCoord.z) 
            };
            
            // Add waypoints for smooth corners if it's a corridor turn
            // (Simple version: just point to point)
            points.push(localPoint);
        }

        return points;
    },

    getNodeCoordinate(nodeName) {
        const n = nodeName.toLowerCase();
        
        // Exact match
        if (this.nodeCoordinates[n]) return this.nodeCoordinates[n];
        
        // Heuristic for unknown nodes (e.g., if graph has intermediate nodes)
        // Default to Origin if not found (Should ideally error or log)
        console.warn("Missing coordinate for:", n);
        return { x: 0, z: 0 };
    },

    // --- NAVIGATION TEXT LOGIC (Ported from SmartNavigation) ---

    generateDirections(path) {
        if (!this.graph) return [];
        let steps = [];

        for (let i = 0; i < path.length - 1; i++) {
            let current = path[i];
            let next = path[i + 1];
            let prev = i > 0 ? path[i - 1] : null;

            // 1. Leaving a Room
            if (this.graph[current].type === "room") {
                steps.push(`Exit ${current.toUpperCase()} and enter the corridor. ⬆️`);
            }

            // 2. Connector: Corridor -> Corridor
            else if (this.graph[current].type === "corridor" && this.graph[next].type === "corridor") {
                let turn = this.getTurn(prev, current, next);
                let dist = this.getCorridorDistance(prev, next, current);
                let distText = dist > 0 ? ` for ${dist}m` : '';

                if (turn === "left") steps.push(`Turn left and follow the corridor${distText}. ⬅️`);
                else if (turn === "right") steps.push(`Turn right and follow the corridor${distText}. ➡️`);
                else steps.push(`Walk straight along the corridor${distText}. ⬆️`);
            }

            // 3. Arrival: Corridor -> Room
            else if (this.graph[next].type === "room") {
                let turn = this.getTurn(prev, current, next);
                let dist = this.getCorridorDistance(prev, next, current);
                let distText = dist > 0 ? ` for ${dist}m` : '';

                if (turn === "left") steps.push(`Turn left and follow the corridor${distText}. ⬅️`);
                else if (turn === "right") steps.push(`Turn right and follow the corridor${distText}. ➡️`);
                else if (turn === "forward" && dist > 5) steps.push(`Walk straight along the corridor${distText}. ⬆️`);

                let walkingDirection = this.getWalkingDirection(current, next, prev);
                let side = this.getRoomSide(walkingDirection, this.graph[next].position, current);
                let arrow = side === 'left' ? '⬅️' : (side === 'right' ? '➡️' : '');
                
                steps.push(`Your Destination is on ${side}. ${arrow}`);
            }
        }
        return steps;
    },

    getAlliedCorridor(nodeName) {
        if (!this.graph[nodeName]) return null;
        if (this.graph[nodeName].type === 'corridor') return nodeName;
        const neighbors = this.graph[nodeName].neighbors || [];
        for (let n of neighbors) {
            if (this.graph[n] && this.graph[n].type === 'corridor') return n;
        }
        return null;
    },

    getTurn(prev, current, next) {
        if (!prev) return "forward";
        let prevCorridor = this.getAlliedCorridor(prev);
        let currentCorridor = current;

        if (prevCorridor === "corridor_right" && currentCorridor === "corridor_top") return "left";
        if (prevCorridor === "corridor_top" && currentCorridor === "corridor_right") return "right";
        if (prevCorridor === "corridor_top" && currentCorridor === "corridor_left") return "left";
        if (prevCorridor === "corridor_left" && currentCorridor === "corridor_top") return "right";
        return "forward";
    },

    getRoomSide(walkingDirection, position, corridorName) {
        let rules = {
            up: { inner: "left", outer: "right" },
            down: { inner: "right", outer: "left" },
            left: { inner: "left", outer: "right" },
            right: { inner: "right", outer: "left" }
        };
        // Mirror rules for Left Corridor (West side)
        if (corridorName === 'corridor_left') {
            rules = {
                up: { inner: "right", outer: "left" },
                down: { inner: "left", outer: "right" },
                left: { inner: "left", outer: "right" },
                right: { inner: "right", outer: "left" }
            };
        }
        return rules[walkingDirection] ? rules[walkingDirection][position] : "unknown";
    },

    getWalkingDirection(from, to, prev) {
        let prevCorridor = this.getAlliedCorridor(prev) || prev;
        if (from === "corridor_right") {
            if (prevCorridor === "corridor_top") return "down";
            return "up";
        }
        if (from === "corridor_top") {
            if (prevCorridor === "corridor_left") return "right";
            return "left";
        }
        if (from === "corridor_left") {
            if (prevCorridor === "corridor_top") return "down";
            return "up";
        }
        return "up";
    },

    extractRoomNumber(nodeName) {
        const match = nodeName.match(/c(\d+)/i);
        return match ? parseInt(match[1]) : null;
    },

    getCorridorDistance(startNode, endNode, corridorName) {
        if (!this.graph) return 0;
        let startVal = this.extractRoomNumber(startNode);
        let endVal = this.extractRoomNumber(endNode);

        if (endNode === 'corridor_top' && corridorName === 'corridor_right') endVal = 208.5;
        if (startNode === 'corridor_top' && corridorName === 'corridor_right') startVal = 208.5;
        if (startNode === 'corridor_right' && corridorName === 'corridor_top') startVal = 209;
        if (endNode === 'corridor_right' && corridorName === 'corridor_top') endVal = 209;
        if (endNode === 'corridor_left' && corridorName === 'corridor_top') endVal = 210.5;
        if (startNode === 'corridor_left' && corridorName === 'corridor_top') startVal = 210.5;
        if (startNode === 'corridor_top' && corridorName === 'corridor_left') startVal = 210.5;
        if (endNode === 'corridor_top' && corridorName === 'corridor_left') endVal = 210.5;

        // Handle raw entries
        if (startNode === 'corridor_right') startVal = 201;
        if (startNode === 'corridor_left') startVal = 214;

        if (startVal && endVal) {
            return Math.abs(endVal - startVal) * this.ROOM_WIDTH;
        }
        return this.ROOM_WIDTH;
    }
};

window.MapService = MapService;
