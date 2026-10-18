-- Leave Management System — seed data
-- Run with: psql -U postgres -d leav -f seed.sql  (after schema.sql)
--
-- Demo credentials (password for every account): Password123
-- Seed inserts are safe to rerun; existing rows are left unchanged.

-- ---------- Managers (own table, own login) ----------
INSERT INTO managers (id, name, email, password) VALUES
  (1, 'Sophia Alvarez', 'sophia@company.com', '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy'),
  (2, 'Liam Benson',    'liam@company.com',   '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy'),
  (7, 'Maya Patel',     'maya@company.com',   '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy')
ON CONFLICT (email) DO NOTHING;

SELECT setval('managers_id_seq', (SELECT MAX(id) FROM managers));

-- ---------- Employees (own table, own login) ----------
-- Each employee references a manager via manager_id, so each manager sees only
-- their own team's requests.
INSERT INTO employees (id, name, email, password, manager_id) VALUES
  (3, 'Ava Carter',   'ava@company.com',    '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy', 1),
  (4, 'Noah Diaz',    'noah@company.com',   '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy', 1),
  (5, 'Emma Fischer', 'emma@company.com',   '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy', 1),
  (6, 'Olivia Grant', 'olivia@company.com', '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy', 2),
  (8, 'Zoe Martin',   'zoe@company.com',    '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy', 7)
ON CONFLICT (email) DO NOTHING;

SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees));

-- ---------- Leave balances ----------
-- Every employee starts with the full annual entitlement:
-- earned = 12 days, sick = 10 days (total = 22).
-- Balances below already reflect approved seed leaves.

INSERT INTO leave_balances (employee_id, earned_leave, sick_leave) VALUES
  (3, 9,  10),  -- Ava:   3 earned days approved in June 2026
  (4, 12, 7),   -- Noah:  3 sick days approved in May 2026
  (5, 10, 10),  -- Emma:  2 earned days approved in June 2026
  (6, 12, 10),  -- Olivia: untouched
  (8, 12, 10)   -- Zoe:    untouched
ON CONFLICT (employee_id) DO NOTHING;

-- ---------- Leave requests ----------
-- (days are full working days, Mon-Fri; public holidays ignored)

INSERT INTO leaves (id, employee_id, leave_type, start_date, end_date, days, reason, status, reviewed_by, reviewed_at) VALUES
  -- Approved / deducted
  (1, 3, 'earned', '2026-06-08', '2026-06-10', 3, 'Family trip',             'approved', 1, '2026-05-20T10:00:00Z'),
  (2, 4, 'sick',   '2026-05-12', '2026-05-14', 3, 'Flu recovery',            'approved', 1, '2026-05-15T09:30:00Z'),
  (3, 5, 'earned', '2026-06-15', '2026-06-16', 2, 'Wedding attendance',      'approved', 1, '2026-06-01T14:00:00Z'),
  -- Rejected / cancelled (no deduction)
  (4, 5, 'sick',   '2026-04-06', '2026-04-07', 2, 'Migraine',                'rejected', 1, '2026-04-03T11:00:00Z'),
  (5, 3, 'earned', '2026-03-09', '2026-03-10', 2, 'Banking appointment',     'cancelled', NULL, NULL),
  -- Pending
  (6, 3, 'sick',   '2026-11-02', '2026-11-04', 3, 'Planned surgery follow-up', 'pending', NULL, NULL),
  (7, 4, 'earned', '2026-12-07', '2026-12-11', 5, 'Holiday with family',     'pending', NULL, NULL),
  (8, 8, 'earned', '2026-12-14', '2026-12-15', 2, 'Family visit',            'pending', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval('leaves_id_seq', (SELECT MAX(id) FROM leaves));