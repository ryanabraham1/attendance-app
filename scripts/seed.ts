import { neon } from "@neondatabase/serverless";

const connection = process.env.DATABASE_URL;
if (!connection) throw new Error("DATABASE_URL is required.");
const sql = neon(connection);
const existing = await sql`select count(*)::int as count from members`;
if (Number(existing[0].count) > 0) {
  console.log("Seed skipped: the roster already has members.");
  process.exit(0);
}
await sql`
  insert into members (name, group_name, role) values
    ('Alex Rivera', 'Build', 'Member'),
    ('Maya Chen', 'Software', 'Member'),
    ('Sam Patel', 'Design', 'Member'),
    ('Jordan Kim', 'Business', 'Member')
`;
console.log("Added four fictional members for local testing.");
