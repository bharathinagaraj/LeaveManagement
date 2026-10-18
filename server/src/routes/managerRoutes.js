import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  getRequests,
  getRequest,
  getProcessed,
  approve,
  reject,
  getEmployees,
  createEmployee,
} from "../controllers/managerController.js";

const router = Router();

router.use(authenticate, requireRole("manager"));

router.get("/employees", getEmployees);
router.post("/employees", createEmployee);
router.get("/requests", getRequests);
router.get("/requests/processed", getProcessed);
router.get("/requests/:id", getRequest);
router.put("/requests/:id/approve", approve);
router.put("/requests/:id/reject", reject);

export default router;