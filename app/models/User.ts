import { Schema, model, models, Model, Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;

  firstName: string;
  lastName: string;
  age: number;
  elo: {
    [gameName: string]: number;
  };

  email: string;
  username: string;
  password: string;
  nation: string;
  stripeCustomerId?: string;
  steamUsername?: string;
  epicUsername?: string;

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
  steamUsername: { type: String },
  epicUsername: { type: String },
  
  // Add elo field with default values
  elo: {
    type: Map,
    of: Number,
    default: {
      rocketLeague: 400,
      apexLegends: 400,
      valorant: 400
    }
  },
  
  gamerTags: { type: Map, of: String },
});

export const User: Model<IUser> =
  models.User || model<IUser>("User", userSchema);