CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, role)
);
