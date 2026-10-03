import type { Types } from "mongoose";

type Serializable = Record<string, unknown> & { _id?: Types.ObjectId | string; __v?: unknown };

export function serializeDocument<T extends Serializable>(document: T): Omit<T, "_id" | "__v"> & { id?: string } {
  const { _id, __v, ...rest } = document;
  return {
    ...rest,
    ...(typeof _id === "undefined" ? {} : { id: _id.toString() })
  };
}
