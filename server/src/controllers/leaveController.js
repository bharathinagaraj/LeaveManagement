import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getBalances,
  listMyRequests,
  createRequest,
  cancelRequest,
} from "../services/leaveService.js";

export const getBalance = asyncHandler(async (req, res) => {
  const balances = await getBalances(req.user.id);
  res.status(200).json(balances);
});

export const getMyRequests = asyncHandler(async (req, res) => {
  const leaves = await listMyRequests(req.user.id);
  res.status(200).json({ leaves });
});

export const createLeave = asyncHandler(async (req, res) => {
  const leave = await createRequest(req.user.id, {
    leaveType: req.body.leaveType,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    reason: req.body.reason,
  });
  res.status(201).json({ leave });
});

export const cancelLeave = asyncHandler(async (req, res) => {
  const leave = await cancelRequest(req.user.id, Number(req.params.id));
  res.status(200).json({ leave });
});