import { Schema, model, models, Model, Document,Types } from "mongoose";

export interface IUser extends Document {
 _id: Types.ObjectId;  // specify _id type

  name: string;
  age: number;
  email: string;
  password: string;
  stripeCustomerId?: string; // Add this here
  gamerTags: {
    [gameName: string]: string;
  };
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  stripeCustomerId: { type: String }, // Add field to schema
  gamerTags: { type: Map, of: String },
});

export const User: Model<IUser> = models.User || model<IUser>("User", userSchema);
