import { Router } from "express";
import { register, login, me } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

router.post("/register", authenticate, requireRole("manager"), register);
// Separate logins: POST /login/employee and POST /login/manager.
// POST /login with { role } in the body is kept for compatibility.
router.post("/login/:role", login);
router.post("/login", login);
router.get("/me", authenticate, me);

export default router;