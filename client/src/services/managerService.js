import api from "./api";

export const getRequests = async (status) => {
  const { data } = await api.get("/manager/requests", {
    params: status ? { status } : {},
  });
  return data.requests;
};

export const getRequest = async (id) => {
  const { data } = await api.get(`/manager/requests/${id}`);
  return data.request;
};

export const getProcessed = async () => {
  const { data } = await api.get("/manager/requests/processed");
  return data.requests;
};

export const approveRequest = async (id) => {
  const { data } = await api.put(`/manager/requests/${id}/approve`);
  return data.request;
};

export const rejectRequest = async (id) => {
  const { data } = await api.put(`/manager/requests/${id}/reject`);
  return data.request;
};

export const getEmployees = async () => {
  const { data } = await api.get("/manager/employees");
  return data.employees;
};

export const createEmployee = async (employee) => {
  const { data } = await api.post("/manager/employees", employee);
  return data.employee;
};