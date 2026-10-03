import { Schema, model, type InferSchemaType } from "mongoose";

const assetSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ["garden", "plant"] },
    parentAssetId: { type: Schema.Types.ObjectId, ref: "Asset", default: null },
    attributes: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

assetSchema.index({ parentAssetId: 1, name: 1 });

export type AssetDocument = InferSchemaType<typeof assetSchema>;
export const Asset = model<AssetDocument>("Asset", assetSchema);
