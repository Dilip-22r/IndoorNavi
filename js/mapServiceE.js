/**
 * mapServiceE.js
 * Specialized navigation logic for Block E.
 */

const MapServiceE = {
    mapData: null,

    async loadMap() {
        try {
            const res = await fetch("block_e_map.json");
            this.mapData = await res.json();
            console.log("Block E Map Loaded");
            return this.mapData;
        } catch (e) {
            console.error("Failed to load Block E map:", e);
            return null;
        }
    },

    // --- User Provided Logic ---

    getRoomCoord(room, data) {
        if (!data) data = this.mapData;
        const h = data.corridors.horizontal.find(c => c.id === room.corridor);
        if (h) return { x: room.position, y: h.y };
    
        const v = data.corridors.vertical.find(c => c.id === room.corridor);
        if (v) return { x: v.x, y: room.position };
    },
    
    chooseVerticalByZone(endX, data) {
        if (!data) data = this.mapData;
        const zone = data.zones.find(z => endX >= z.minX && endX < z.maxX);
        return zone.vertical;
    },
    
    navigate(startId, endId, data) {
        if (!data) data = this.mapData;
    
        const startRoom = data.rooms.find(r => r.id === startId);
        const endRoom = data.rooms.find(r => r.id === endId);

        if (!startRoom || !endRoom) return ["Invalid room ID"];
    
        const start = this.getRoomCoord(startRoom, data);
        const end = this.getRoomCoord(endRoom, data);
    
        let steps = [];
        steps.push(`Exit ${startId}.`);
    
        // SAME CORRIDOR
        if (startRoom.corridor === endRoom.corridor) {
            const dist = Math.abs(end.x - start.x + end.y - start.y);
            steps.push(`Walk ${dist} meters straight.`);
            steps.push(`Destination ${endId} will be on your ${endRoom.side || "side"}.`);
            return steps;
        }
    
        // Vertical room to horizontal
        if (startRoom.corridor.startsWith("V")) {
            const dir = end.y > start.y ? "south" : "north";
            steps.push(`Walk ${Math.abs(end.y - start.y)} meters ${dir}.`);
            steps.push(`Turn ${end.x > start.x ? "left" : "right"} onto ${endRoom.corridor}.`);
            steps.push(`Walk ${Math.abs(end.x - start.x)} meters.`);
            steps.push(`You are now facing ${endId}.`);
            return steps;
        }
    
        // Horizontal to horizontal (different)
        const verticalId = this.chooseVerticalByZone(end.x, data);
        const vertical = data.corridors.vertical.find(v => v.id === verticalId);
    
        // Move horizontally to vertical
        const horizontalDist = Math.abs(vertical.x - start.x);
        steps.push(
            `Walk ${horizontalDist} meters ${vertical.x > start.x ? "east" : "west"} on ${startRoom.corridor}.`
        );
    
        steps.push(
            vertical.x > start.x ?
            `Turn right into corridor ${verticalId}.` :
            `Turn left into corridor ${verticalId}.`
        );
    
        // Move vertically
        const verticalDist = Math.abs(end.y - start.y);
        steps.push(
            `Walk ${verticalDist} meters ${end.y > start.y ? "south" : "north"}.`
        );
    
        // Turn into final corridor
        steps.push(
            end.x > vertical.x ?
            `Turn left onto ${endRoom.corridor}.` :
            `Turn right onto ${endRoom.corridor}.`
        );
    
        // Final move
        const finalDist = Math.abs(end.x - vertical.x);
        steps.push(
            `Walk ${finalDist} meters ${end.x > vertical.x ? "east" : "west"}.`
        );
    
        steps.push(`You are now facing ${endId}.`);
    
        return steps;
    }
};

window.MapServiceE = MapServiceE;
