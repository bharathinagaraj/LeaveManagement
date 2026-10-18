import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  getBalance,
  getMyRequests,
  createLeave,
  cancelLeave,
} from "../controllers/leaveController.js";

const router = Router();

router.use(authenticate);

// Every employee keeps their own balance and requests.
router.get("/balance", requireRole("employee"), getBalance);
router.get("/mine", requireRole("employee"), getMyRequests);
router.post("/", requireRole("employee"), createLeave);
router.delete("/:id", requireRole("employee"), cancelLeave);

export default router;