// Role and permission mapping for AI-Persona SaaS
// Only two roles: ADMIN and MEMBER (see schema.prisma MemberRole enum)

const roles = {
  ADMIN: [
    "invite_user",
    "remove_user",
    "update_workspace",
    "delete_workspace",
    "manage_members",
    "view_workspace",
    "view_persona",
    "create_persona",
    "update_persona",
    "delete_persona",
    "view_billing",
    "update_billing",
    "view_audit_logs",
  ],
  MEMBER: [
    "view_workspace",
    "view_persona",
    "create_persona",
    "update_persona",
    "delete_persona",
    "update_self",
  ],
};

module.exports = roles;
