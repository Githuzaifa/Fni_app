import { Schema, model, models, Model, Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;

  firstName: string;
  lastName: string;
  age: number;
  email: string;
  username: string; // FNI username
  password: string;
  nation: string;
  stripeCustomerId?: string;

  gamerTags: {
    [gameName: string]: string;
  };
}

const userSchema = new Schema<IUser>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  age: { type: Number, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nation: { type: String, required: true },
  stripeCustomerId: { type: String },

  gamerTags: { type: Map, of: String },
});

export const User: Model<IUser> =
  models.User || model<IUser>("User", userSchema);