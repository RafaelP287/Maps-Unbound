# Testing API Calls for the server

Test out the following api calls, and send JSON data to them. The server listens on port 3000, and you can use `localhost` to access it. The server should output what kind of data it receives as well, for debugging purposes.

## User Management

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
