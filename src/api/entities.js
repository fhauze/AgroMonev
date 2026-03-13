import api from "@/api/client";

export const entity = (prefix, entity) => ({
  list: (params) => api.get(`/${prefix}/${entity}`, { params }),
  create: (data) => api.post(`/${prefix}/${entity}`, data),
  update: (id, data) => api.put(`/${prefix}/${entity}/${id}`, data),
  delete: (id) => api.delete(`/${prefix}/${entity}/${id}`),
  find: (params) => api.get(`/${prefix}/${entity}`, { params }),
  findOne: (id) => api.get(`/${prefix}/${entity}/${id}`),
});