const saveUserData = async (user) => {
  const scriptUrl = process.env.REACT_APP_SHEET_EXTENSION_URL;

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      throw new Error("Failed to save user data.");
    }

    const result = await response.text();
    console.log(result);
  } catch (error) {
    console.error("Error saving user data:", error);
  }
};
