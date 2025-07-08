declare namespace Express {
  export interface Request {
    user?: import("../User").User;
  }
}
