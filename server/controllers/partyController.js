import Party from "../models/Party.js";
import crypto from "crypto";

// Helper to generate a random 6-character alphanumeric code
const generateLobbyCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
  }
  return code;
};

export const createParty = async (req, res) => {
  try {
    const { owner, partyName, isPublic, maxPlayers } = req.body;

    // Enforce single-party ownership constraint
    const existingParty = await Party.findOne({ owner });
    if (existingParty) {
      return res.status(400).json({ 
        message: "You already own an active party. Please delete it or wait for it to expire." 
      });
    }

    // Generate a guaranteed unique lobby code
    let isUnique = false;
    let newLobbyCode = "";
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      newLobbyCode = generateLobbyCode();
      const codeCollision = await Party.findOne({ lobbyCode: newLobbyCode });
      
      if (!codeCollision) {
        isUnique = true;
      }
      attempts++;
    }

    // Failsafe in case the loop maxes out
    if (!isUnique) {
      return res.status(500).json({ 
        message: "Network is currently busy. Failed to generate a unique lobby code." 
      });
    }

    // Save the new party
    const newParty = new Party({
      owner,
      partyName: partyName || `${owner}'s Party`, // Failsafe fallback
      isPublic,
      maxPlayers,
      lobbyCode: newLobbyCode,
      players: [owner], 
    });

    const savedParty = await newParty.save();
    res.status(201).json(savedParty);
  } catch (error) {
    res.status(400).json({ message: "Failed to create party", error: error.message });
  }
};

export const getPublicParties = async (req, res) => {
  try {
    // Only return parties where isPublic is true
    const publicParties = await Party.find({ isPublic: true })
      .select("-__v") // Exclude mongoose version key
      .sort({ createdAt: -1 }); // Newest first

    res.status(200).json(publicParties);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to fetch public parties",
        error: error.message,
      });
  }
};

export const joinParty = async (req, res) => {
  try {
    const { lobbyCode, username } = req.body;

    // Enforce single-party global constraint
    const existingParty = await Party.findOne({ players: username });
    if (existingParty) {
      return res.status(400).json({ message: "You are already in a party. Please leave it first." });
    }

    const party = await Party.findOne({ lobbyCode: lobbyCode.toUpperCase() });

    if (!party) {
      return res
        .status(404)
        .json({ message: "Party not found or has expired." });
    }

    if (party.players.includes(username)) {
      return res
        .status(400)
        .json({ message: "You are already in this party." });
    }

    if (party.players.length >= party.maxPlayers) {
      return res.status(400).json({ message: "This party is already full." });
    }

    // Add user to the array and save
    party.players.push(username);
    await party.save();

    res.status(200).json({ message: "Successfully joined party", party });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to join party", error: error.message });
  }
};

export const leaveParty = async (req, res) => {
  try {
    const { username } = req.body;

    const party = await Party.findOne({ players: username });
    if (!party) {
      return res.status(400).json({ message: "You are not currently in a party." });
    }

    // If the owner leaves, disband the entire party
    if (party.owner === username) {
      await Party.findByIdAndDelete(party._id);
      return res.status(200).json({ message: "Party disbanded because the owner left." });
    }

    // Otherwise, just remove the player from the array
    party.players = party.players.filter((player) => player !== username);
    await party.save();

    res.status(200).json({ message: "Successfully left the party." });
  } catch (error) {
    res.status(500).json({ message: "Error leaving party", error: error.message });
  }
};

export const kickPlayer = async (req, res) => {
  try {
    const { ownerUsername, playerToKick } = req.body;

    const party = await Party.findOne({ owner: ownerUsername });
    if (!party) {
      return res.status(403).json({ message: "You do not own an active party." });
    }

    if (ownerUsername === playerToKick) {
      return res.status(400).json({ message: "You cannot kick yourself." });
    }

    if (!party.players.includes(playerToKick)) {
      return res.status(404).json({ message: "Player is not in your party." });
    }

    party.players = party.players.filter((player) => player !== playerToKick);
    await party.save();

    res.status(200).json({ message: `${playerToKick} was kicked from the party.` });
  } catch (error) {
    res.status(500).json({ message: "Error kicking player", error: error.message });
  }
};

export const deleteParty = async (req, res) => {
  try {
    const { id } = req.params;

    // This expects the username to be sent in the request body.
    // If you are using JWT auth middleware, you would use req.user.username instead.
    const { username } = req.body;

    const party = await Party.findById(id);

    if (!party) {
      return res
        .status(404)
        .json({ message: "Party not found or already expired." });
    }

    // Enforce ownership constraint
    if (party.owner !== username) {
      return res
        .status(403)
        .json({
          message: "Unauthorized: You can only delete a party you own.",
        });
    }

    await Party.findByIdAndDelete(id);
    res.status(200).json({ message: "Party successfully deleted." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete party", error: error.message });
  }
};
