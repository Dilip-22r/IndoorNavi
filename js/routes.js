const navigationData = {
    building: "Block-C",
    floor: 2,
    unit: "meters",
    segmentLength: 5,

    routes: {
        "C201_to_C203": {
            distance: 10,
            points: [
                { x: 0, y: 0.1, z: 0 },
                { x: 0, y: 0.1, z: -5 },
                { x: 0, y: 0.1, z: -10 }
            ],
            turns: []
        },

        "C201_to_C205": {
            distance: 15,
            points: [
                { x: 0, y: 0.1, z: 0 },
                { x: 0, y: 0.1, z: -5 },
                { x: 0, y: 0.1, z: -10 },
                { x: 5, y: 0.1, z: -10 }
            ],
            turns: [
                {
                    at: { x: 0, y: 0.1, z: -10 },
                    direction: "right"
                }
            ]
        },

        "C201_to_C214": {
            distance: 20,
            points: [
                { x: 0, y: 0.1, z: 0 },
                { x: 0, y: 0.1, z: -5 },
                { x: 0, y: 0.1, z: -10 },
                { x: 5, y: 0.1, z: -10 },
                { x: 10, y: 0.1, z: -10 }
            ],
            turns: [
                {
                    at: { x: 0, y: 0.1, z: -10 },
                    direction: "right"
                }
            ]
        }
    }
};
