# One User across many Companies

A person has a single User login and joins each Company through a Membership; they are not given a separate account per Company. Subcontractors routinely work for several builders, and one login across them all was a goal from the start. The cost is that every query and permission check must be scoped to a Company, so data never leaks between Companies that share a User.
