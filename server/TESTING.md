# Testing API Calls for the server

Test out the following api calls, and send JSON data to them. The server listens on port 3000, and you can use `localhost` to access it. The server should output what kind of data it receives as well, for debugging purposes.

So far, all api calls are implemented for admin control. Endpoints for the average user will be implemented in the future, and will consist of more limited control

## User Management

### Testing GET method to get all users

This GET method fetches all available users and their information as an array of JSON entries.

```bash
# Fetches all available users
curl --request GET \
  http://localhost:3000/api/users
```

### Testing GET method to get a single user

This GET method fetches the information of a single user by username, using the endpoint `/api/user/{username}`.

```bash
# Fetches the information for a user named "tofu"
curl --request GET \
  http://localhost:3000/api/user/tofu
```

### Testing DELETE method to delete a user

This DELETE method takes in an endpoint in the form of `/api/user/{username}` in order to delete a user specified by their username.

```bash
# Deletes a user with the username "tofu"
curl --request DELETE \
  http://localhost:3000/api/user/tofu

# Deletes a user with the username "miso"
curl --request DELETE \
  http://localhost:3000/api/user/miso
```

Similarly, you can test with other inputs by changing the value that takes place of the `username`.

### Testing POST method to register a new user

This method takes in JSON data with `username`, `email`, and `password` fields. The data that is sent and returned should include a hashed version of the user's password, which should be stored in the database. The `username` and `email` fields should also be unique, and return errors if you attempt to send a duplicate value of one of these fields.

```bash
# Creates a user "tofu" with email "tofu@gmail.com"
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{ "username": "tofu", "email": "tofu@gmail.com", "password": "123" }' \
  http://localhost:3000/api/register/ 

# Creates a user "miso" with email "miso@gmail.com"
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{ "username": "miso", "email": "miso@gmail.com", "password": "123" }' \
  http://localhost:3000/api/register/ 
```

Similarly, you can test with other inputs by simply editing the fields within the data requests.

### Testing POST method to validate a new user

This method takes in JSON data with `username` and `password` fields. Upon a successful login, we should be able to see a a status code 200 as an OK response. Else, we should see a 4XX error code on invalid credentials.

```bash
# Attempts to validate a user "tofu" with password "123" (OK)
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{ "username": "tofu", "password": "123" }' \
  http://localhost:3000/api/login/ 

# Attempts to validate a user "tofu" with password "1234" (ERROR)
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{ "username": "tofu", "password": "1234" }' \
  http://localhost:3000/api/login/ 
```

Similarly, you can test with other inputs by simply editing the fields within the data requests.

### Testing PUT method to edit a user's profile bio

This method takes in JSON data with `username` and `bio` fields. It should change the bio property of a user's profile to whatever was sent.

```bash
# Edits the bio of "tofu"
curl --header "Content-Type: application/json" \
  --request PUT \
  --data '{ "bio": "Hello, I am a tofu"}' \
  http://localhost:3000/api/profile/tofu

# Edits the bio of "miso"
curl --header "Content-Type: application/json" \
  --request PUT \
  --data '{ "bio": "I am a cup of miso." }' \
  http://localhost:3000/api/profile/miso
```

<!-- Characters and etc. -->

```bash
# Creates a Character
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{
    "name": "John Helldiver",
    "user": "tofu", 
    "race": "Human",
    "class": "Wizard",
    "level": 3,
    "maxLevel": 20,
    "experience": 1500,
    "hp": {
      "current": 24,
      "max": 24
    },
    "mana": {
      "current": 10,
      "max": 10
    },
    "attributes": {
      "strength": 8,
      "dexterity": 14,
      "constitution": 12,
      "intelligence": 18,
      "wisdom": 14,
      "charisma": 10
    },
    "skills": {
      "name": "Arcana",
      "level": 2,
      "desc": "Knowledge of magical signs"
    },
    "spellbook": []
  }' \
  http://localhost:3000/api/characters
```

```bash
# Add a spell
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{ "spellIndex": "fireball" }' \
  http://localhost:3000/character/2/spells
```
