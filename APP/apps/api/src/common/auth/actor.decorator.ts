import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedActor } from "./auth.guard";

/** Injecte l'acteur authentifié posé par AuthGuard. */
export const Actor = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedActor => {
  const req = ctx.switchToHttp().getRequest<{ actor?: AuthenticatedActor }>();
  if (!req.actor) throw new Error("Actor absent — route non gardée ?");
  return req.actor;
});
