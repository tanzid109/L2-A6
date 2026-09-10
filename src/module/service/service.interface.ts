export interface ICreateServicePayload {
  title: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  duration: number;
  imageUrl?: string;
  imagePublicId?: string;
}

export interface IUpdateServicePayload {
  title?: string;
  slug?: string;
  description?: string;
  category?: string;
  price?: number;
  duration?: number;
  imageUrl?: string;
  imagePublicId?: string;
  isActive?: boolean;
}

export interface IServiceQueryParams {
  search?: string;
  category?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}

export interface IServiceMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IServiceListResponse {
  meta: IServiceMeta;
  data: any[];
}
