/**
 * 基礎實體介面
 */

export interface IEntity<ID = string> {
  id: ID;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 可軟刪除的實體介面
 */
export interface ISoftDeletableEntity<ID = string> extends IEntity<ID> {
  deletedAt?: Date | null;
  isDeleted: boolean;
}

/**
 * 可版本控制的實體介面
 */
export interface IVersionedEntity<ID = string> extends IEntity<ID> {
  version: number;
}

/**
 * 可審計的實體介面
 */
export interface IAuditableEntity<ID = string> extends IEntity<ID> {
  createdBy?: string;
  updatedBy?: string;
}

/**
 * 完整功能實體介面
 */
export interface IFullEntity<ID = string> 
  extends IEntity<ID>, 
          ISoftDeletableEntity<ID>, 
          IVersionedEntity<ID>, 
          IAuditableEntity<ID> {}