import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        gender: { type: String, default: "unspecified", trim: true },
        age: { type: Number, min: 13, max: 120 },
        nationality: { type: String, default: "unspecified", trim: true },
        socialLinks: {
            linkedin: { type: String, default: "", trim: true },
            instagram: { type: String, default: "", trim: true },
            snapchat: { type: String, default: "", trim: true }
        }
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
