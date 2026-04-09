import Companion from "../models/Companion.js";
import { generateAvatarImage } from "../services/avatarService.js";

export const generateCompanionAvatar = async (req, res) => {
    const companion = await Companion.findOne({ _id: req.params.id, userId: req.user.id });
    if (!companion) {
        const error = new Error("Companion not found");
        error.status = 404;
        throw error;
    }

    const result = await generateAvatarImage({
        avatarSettings: companion.avatarSettings,
        gender: companion.gender,
        name: companion.name
    });

    companion.avatarSettings.avatarPrompt = result.avatarPrompt;
    companion.avatarSettings.avatarImageData = result.avatarImageData;
    companion.avatarSettings.avatarImageMimeType = result.avatarImageMimeType;
    companion.avatar = result.avatarImageUrl;
    await companion.save();

    res.json({
        avatarImageUrl: result.avatarImageUrl,
        companion
    });
};
