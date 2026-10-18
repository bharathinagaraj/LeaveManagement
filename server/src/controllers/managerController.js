import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listRequests,
  getRequestDetails,
  listProcessed,
  approveRequest,
  rejectRequest,
} from "../services/approvalService.js";
import {
  listManagedEmployees,
  registerUser,
} from "../services/authService.js";

export const getEmployees = asyncHandler(async (req, res) => {
  const employees = await listManagedEmployees(req.user.id);
  res.status(200).json({ employees });
});

export const createEmployee = asyncHandler(async (req, res) => {
  const employee = await registerUser({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    managerId: req.user.id,
  });
  res.status(201).json({ employee });
});

export const getRequests = asyncHandler(async (req, res) => {
  const requests = await listRequests(req.user.id, req.query.status);
  res.status(200).json({ requests });
});

export const getRequest = asyncHandler(async (req, res) => {
  const request = await getRequestDetails(req.user.id, Number(req.params.id));
  res.status(200).json({ request });
});

export const getProcessed = asyncHandler(async (req, res) => {
  const requests = await listProcessed(req.user.id);
  res.status(200).json({ requests });
});

export const approve = asyncHandler(async (req, res) => {
  const { request, deductedDays } = await approveRequest(
    req.user.id,
    Number(req.params.id)
  );
  res.status(200).json({ request, deductedDays });
});

export const reject = asyncHandler(async (req, res) => {
  const { request } = await rejectRequest(req.user.id, Number(req.params.id));
  res.status(200).json({ request });
});