

export const mockCampaigns = [
    {
        _id: "1",
        title: "The Lost Mines of Phandelver",
        description: "A classic D&D adventure set in the Forgotten Realms.",
        members: [
            { userId: "11", role: "DM"},
            { userId: "me", role: "Player"},
            { userId: "13", role: "Player"}
        ]
    },
    {
        _id: "2",
        title: "Curse of Strahd",
        description: "A gothic horror campaign set in the land of Barovia.",
        members: [
            { userId: "me", role: "DM"},
            { userId: "22", role: "Player"},
            { userId: "23", role: "Player"},
            { userId: "24", role: "Player"}
        ]
    },
    {
        _id: "3",
        title: "Waterdeep: Dragon Heist",
        description: "An urban adventure set in the city of Waterdeep.",
        members: [
            { userId: "31", role: "DM"},
            { userId: "me", role: "Player"}
        ]   
    }
];