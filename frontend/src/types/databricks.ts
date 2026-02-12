/** Shared types for Databricks API responses. Used by frontend when calling backend. */

export interface Catalog {
  name: string
  owner?: string
  full_name?: string
  catalog_type?: string
  metastore_id?: string
}

export interface CatalogsResponse {
  catalogs: Catalog[]
}

export interface Schema {
  name: string
  full_name?: string
  catalog_name?: string
}

export interface SchemasResponse {
  schemas: Schema[]
}
