import { defineRailway, github, project, service } from "railway/iac";

// Download website: Railway builds website/Dockerfile from master on every push,
// once the GitHub checks (release workflow) have passed.
export default defineRailway(() => {
  const website = service("website", {
    source: github("Nikzz3/wildlinge", { branch: "master", checkSuites: true }),
    build: { builder: "DOCKERFILE", dockerfilePath: "website/Dockerfile" },
    healthcheck: "/",
    replicas: { "europe-west4-drams3a": 1 },
  });

  return project("wildlinge", {
    resources: [website],
  });
});
