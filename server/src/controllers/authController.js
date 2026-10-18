import { asyncHandler } from "../utils/asyncHandler.js";
import { registerUser, loginUser, getUserById } from "../services/authService.js";

export const register = asyncHandler(async (req, res) => {
  const user = await registerUser({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    managerId: req.user.id,
  });

  res.status(201).json({ user });
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await loginUser({
    email: req.body.email,
    password: req.body.password,
    role: req.params.role || req.body.role,
  });
  res.status(200).json({ user, token });
});

export const me = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id, req.user.role);
  res.status(200).json({ user });
});