import { buildImprovementPlan } from "../services/improveService.js";

export const improve = async (req, res) => {
    const { problem, companionId, mode } = req.body;
    const result = await buildImprovementPlan({ userId: req.user.id, companionId, problem, mode });
    res.json(result);
};
