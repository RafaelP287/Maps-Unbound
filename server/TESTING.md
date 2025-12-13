# Testing API Calls for the server

Test out the following api calls, and send JSON data to them. The server listens on port 3000, and you can use `localhost` to access it. The server should output what kind of data it receives as well, for debugging purposes.

So far, all api calls are implemented for admin control. Endpoitns for the average user will be implemented in the future, and will consist of more limited control

## User Management

### Testing GET method to get all users

This method fetches all available users and their information as an array of JSON entries.

```bash
curl --request GET \
  http://localhost:3000/api/users
```

### Testing POST method to create a new user

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
