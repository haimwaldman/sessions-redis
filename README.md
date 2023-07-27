## **SESSIONS-REDIS**

This app is a home assignment to manage sessions with Redis.

## Running the app:

1.  Clone the repository.
2.  The repository includes a config.json file where you can config the session and the wait durations in minute units.
3.  Open the root folder in terminal and run the command:

        docker-compose up

## The app logic

- Once a user logs in - a session is created.
- If a user logs in again - the session is renewed.
- The session's duration is one hour (configurable).
- The session enables the use of the root route ('/').
- After an hour the root route is blocked for five minutes.
- After five minutes the user can do the activity.
- If a user logs out - the session is deleted.

## Manually testing the app:

In the repository there's a folder named utils. In the utils folder you'll find a postman collection. Import the collection.
There are three queries in the collection:

    GET /login?username=\<username\>

Gets a session for a username.

    GET /

Simple session activity, this route need a live session to work.
Send the sessionId in the header. (Added automatically in postman after the login).

    GET /logout

Deletes the session

## Notes

> 1. For the convenience - I didn't use password
> 2. The choosing of the GET was for the simplicity, even though the convention is to login with POST.
> 3. The files in this app are a mess, there should be a few more folders like src, controller etc.. that I didn't create to save some time.
> 4. I also didn't create unit tests, I just added my postman collection to test it manually.
> 5. Regarding the logic. After 65 minutes the user can now query the session without any time restrictions, unless the user logs in again or logs out. The demands didn't address this matter, so I left it as is.
