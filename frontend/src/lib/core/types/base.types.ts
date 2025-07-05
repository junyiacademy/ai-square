/**
 * 基礎類型定義
 */

/**
 * 基礎實體介面
 */
export interface IEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 軟刪除介面
 */
export interface ISoftDeletable {
  deletedAt: Date | null;
}