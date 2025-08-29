describe("roles utility", () => {
  test("exports ADMIN and MEMBER with expected permissions", () => {
    const roles = require("../../../src/utils/roles");

    expect(roles).toBeDefined();
    expect(Object.keys(roles).sort()).toEqual(["ADMIN", "MEMBER"]);

    expect(Array.isArray(roles.ADMIN)).toBe(true);
    expect(Array.isArray(roles.MEMBER)).toBe(true);

    // Baseline expectations
    expect(roles.MEMBER).toEqual(
      expect.arrayContaining([
        "view_workspace",
        "view_persona",
        "delete_persona",
        "update_self",
      ])
    );

    expect(roles.ADMIN).toEqual(
      expect.arrayContaining([
        "remove_user",
        "manage_members",
        "view_workspace",
        "view_persona",
        "delete_persona",
        "update_self",
      ])
    );
  });

  test("ADMIN is a superset of MEMBER permissions", () => {
    const roles = require("../../../src/utils/roles");

    const memberPermissions = new Set(roles.MEMBER);
    const adminPermissions = new Set(roles.ADMIN);

    for (const perm of memberPermissions) {
      expect(adminPermissions.has(perm)).toBe(true);
    }
  });
});
