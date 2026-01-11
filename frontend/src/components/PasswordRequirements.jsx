import React, { useState, useEffect } from "react";
import axios from "axios";

const PasswordRequirements = ({ password }) => {
  const [rules, setRules] = useState([]);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await axios.get("https://api.hakserver.cc/api/auth/password-policy");
        setRules(res.data.rules);
      } catch (err) {
        console.error("Failed to load password policy: ", err);
      }
    };
    fetchPolicy();
  }, []);

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {rules.map((rule, i) => {
        const valid = new RegExp(rule.regex).test(password);
        return (
          <li
            key={i}
            style={{
              color: valid ? "green" : "gray",
              marginBottom: "0.3rem",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ marginRight: "6px" }}>{valid ? "✅" : "❌"}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
};

export default PasswordRequirements;
