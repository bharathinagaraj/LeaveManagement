import api from "./api";

export const getLeaveBalance = async () => {
  const { data } = await api.get("/leaves/balance");
  return data; // { earnedLeave, sickLeave }
};

export const getMyLeaves = async () => {
  const { data } = await api.get("/leaves/mine");
  return data.leaves;
};

export const applyLeave = async ({ leaveType, startDate, endDate, reason }) => {
  const { data } = await api.post("/leaves", {
    leaveType,
    startDate,
    endDate,
    reason,
  });
  return data.leave;
};

export const cancelLeave = async (id) => {
  const { data } = await api.delete(`/leaves/${id}`);
  return data.leave;
};