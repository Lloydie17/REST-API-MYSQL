import {User, UnitUser, Users} from "./user.interface"
import bcrypt from "bcryptjs"
import {v4 as random} from "uuid"
import mysql from "mysql"

const con = mysql.createConnection({
    host: "localhost",
    user: "root", 
    password: "", 
    database: "rest_api_db", 
});

con.connect((err) => {
    if (err) {
    console.error("Error connecting to MySQL: ", err);
    return;
    }
    console.log("Connected to MySQL database.");
});

function executeQuery(sql: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
        con.query(sql, params, (error, results) => {
            if (error) {
            console.error("Error executing query:", error);
            reject(error);
            } else {
            resolve(results);
            }
        });
    });
}

function loadUsers(): Promise<Users> {
    return new Promise(async (resolve, reject) => {
        try {
            const query = "SELECT * FROM Users";
            const results = await executeQuery(query, []);
            const users: Users = {};
            results.forEach((user: any) => {
                users[user.id] = user;
            });
            resolve(users);
        } catch (error) {
            console.error("Error loading users:", error);
            reject(error)
        }
    })
}

function saveUsers(users: Users): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const truncateQuery = "TRUNCATE TABLE users";
            await executeQuery(truncateQuery, []);

            const values = Object.values(users).map((user) => {
                const insertQuery = "INSERT INTO users SET ?";
                return executeQuery(insertQuery, user);
            }); 
            await Promise.all(values);
            console.log("Users saved successfully!");
            resolve();
        } catch (error) {
            reject(error)
        }
    })
}

export const findAll = async (): Promise<UnitUser[]> => {
    const query = "SELECT * FROM users";
    const users = await executeQuery(query, []);
    return users;
};

export const findOne = async (id: string): Promise<UnitUser | null> => {
    const query = "SELECT * FROM users WHERE id = ?";
    const result = await executeQuery(query, [id]);
    return result.length ? result[0] : null;
};

export const create = async (userData: UnitUser): Promise<UnitUser | null> => {
    const id = random();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    const user: UnitUser = {
        id: id,
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
    };
    const query = "INSERT INTO users SET ?";
    await executeQuery(query, user);
    return user;
};

export const findByEmail = async (user_email: string): Promise<null | UnitUser> => {
    try {
        const users = await loadUsers();
        return Object.values(users).find((user) => user.email === user_email) || null;
        } catch (error) {
        throw error;
    }
};

export const comparePassword = async (email: string, supplied_password: string): Promise<null | UnitUser> => {
    try {
        const user = await findByEmail(email);
        if (!user) return null;
        const isMatch = await bcrypt.compare(supplied_password, user.password);
        return isMatch ? user : null;
    } catch (error) {
        throw error;
    }
};

export const update = async (id: string, updateValues: User): Promise<UnitUser | null> => {
    try {
        const user = await findOne(id);
        if (!user) return null;
        const updatedUser: UnitUser = {
            ...user,
            ...updateValues,
        };
        const users = await loadUsers();
        users[id] = updatedUser;
        await saveUsers(users);
        return updatedUser;
    } catch (error) {
        throw error;
    }
};

export const remove = async (id: string): Promise<null | void> => {
    try {
        const users = await loadUsers();
        if (!users[id]) return;
        delete users[id];
        await saveUsers(users);
    } catch (error) {
        throw error;
    }
};

export const findByNameContaining = async (substring: string): Promise<UnitUser[]> => {
    const allUsers = await findAll();
    const name = allUsers.filter((user) => user.username.includes(substring));
    return name;
};

export const findByEmailContaining = async (user_email: string): Promise<null | UnitUser[]> => {
    const allUsers = await findAll();
    const getUser = allUsers.filter((result) => result.email.includes(user_email));
    if (getUser.length === 0) {
        return null;
    }
    return getUser;
};