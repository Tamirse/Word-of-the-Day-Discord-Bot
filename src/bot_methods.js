const WORDS_FILE_PATH = "./data/wordsRound4_shuffled.json"; // translated words filepath
const wordsTranslated = require(WORDS_FILE_PATH); // contains translated words
const dictionaryWords = require("./data/dictionary_words_um.json"); // contains all words
const Discord = require("discord.js");
const logger = require("./logging.js");
const wordMethods = require("./word_methods.js");
const jsonMethods = require("./json_methods.js");

// initialize Discord Bot and the interval time

const bot = new Discord.Client();
const MSEC_PER_DAY = 86400000;
const MAX_NUM_OF_RICH_EMBER_FIELDS = 25;
const MOD_ROLES = ["Administrator", "Moderators", "Moderator", "Bot-operator"]
const WORD_AMOUNT = Object.keys(wordsTranslated).length; // amount of words in the list
const STOP = 'stop';
const NEXT = 'next';
const TIMEOUT_TIME = 60000; // milliseconds before timing out
let interval; // interval object for the bot. we declare it here so it would be in the global scope

/**
 * sends the word of the day
 * reads from the words.json file then uses the message object to send the message to the channel
 * sends the message as a discord rich embed format (this is just a fancy looking message)
 * @param {Message} message discord message object
 */
function sendWordOfTheDay(message, updateWordStatus = false) {
  let words = wordsTranslated;
  let word = null;

  // get word
  for (const key in words) {
    // get the first word which its' .didPosted property is false
    if (words[key][0].didPosted === false) {
      word = words[key][0];
      delete word.didPosted;
      if (updateWordStatus === true) {
        words[key][0].didPosted = true; // set as true
      }
      break;
    }
  }

  // if word exists, format it (using discord's rich embed) and send in chat
  if (word != null) {
    sendCustomWord(message, word.word, (isWotd = true));
    if (updateWordStatus === true) {
      // set the word as didPosted in the file
      jsonMethods.saveToJSONFile(words, WORDS_FILE_PATH);
    }
  } else {
    message.channel.send("Oops! someone forgot to add more words to the list!");
    return;
  }
}

/**
 * send a word to the channel
 * @param {Message} message discord message object
 * @param {word object} word
 * @param {isWotd} isWotd
 */
function sendCustomWord(message, word, isWotd = false) {
  let wordObj = null;

  if (wordsTranslated[word]) {
    wordObj = wordsTranslated[word];
  } else if (dictionaryWords[word]) {
    wordObj = dictionaryWords[word];
  }

  if (wordObj != null) {

    // Add the word's english translation + any other data that exists
    for (let homonym in wordObj) {

      const wotdEmbed = new Discord.RichEmbed().setColor("#0099ff");

      if (isWotd) {
        wotdEmbed.setTitle("__WORD OF THE DAY__: " + wordObj[0]["word"]);
      }

      console.log(homonym);
      let wordObject = wordObj[homonym];

      for (let key in wordObject) {
        let inline = key == "Notes" ? false : true;
        let value = wordObject[key] ? wordObject[key] : "\u200b";

        // ignore "homonym" and "is_plural" fields
        switch (key) {
          case "word":
          case "part_of_speech":
            value = wordMethods.capitalizeFirstLetter(value);
            break;
          case "homonym":
          case "is_plural":
          case "didPosted":
            continue;
        }

        // value has sub-objects
        if (typeof value == "object") {
          for (wordField in value) {
            let subfieldValue =
              value[wordField].length > 0 ? value[wordField].slice() : "\u200b";
            console.log("key: ", wordField);
            console.log("value: ", subfieldValue);

            switch (wordField) {
              case "singular":
              case "plural":
                subfieldValue[0] = "(Nom): " + subfieldValue[0];
                subfieldValue[1] = "(Gen):   " + subfieldValue[1];
                subfieldValue[2] = "(Par):   " + subfieldValue[2];
                break;
            }

            if (wotdEmbed.fields.length < MAX_NUM_OF_RICH_EMBER_FIELDS) {
              wotdEmbed.addField(
                wordMethods.capitalizeFirstLetter(wordField) + ":",
                subfieldValue,
                inline
              );
            }
          }
        } else {
          wotdEmbed.addField(
            wordMethods.capitalizeFirstLetter(key) + ":",
            value,
            inline
          );
        }
      }

      if (isWotd) {
        wotdEmbed.addField(
          "\u200b",
          `Give me a sentence using the word ${wordObject["word"]}!`
        );
      }

      message.channel.send(wotdEmbed);
    }
  } else {
    message.channel.send("Oops! no such word!");
  }
}

/**
 * Checks if the user who sent the message is an Admin / moderator etc.
 * @param {Message} message
 */
function checkIfAdmin(message) {
  let is_member_mod = true;

  if (message.member != null) {
    // member field is null if this is a private message
    is_member_mod = message.member.roles.some(r =>
      MOD_ROLES.includes(r.name)
    );
  }

  return is_member_mod;
}

/**
 * returns the command string from the message
 * @param {Message} message discord message object
 */
function getCommandFromMessage(message) {
  return message.content.split(" ")[0].substring(1); // get command string
}

/**
 * Handles the "wotd" command
 * sends the current word-of-the-day
 * @param {Message} message discord message object
 */
function handleCommandWotd(message) {
  console.log("Bot sent wotd!");
  //logger.logMessage(message);
  sendWordOfTheDay(message);
}

/**
 * passes out a random word
 * @param {Message} message
 */
function getRandomWord(message)
{
  let words = wordsTranslated;
  let word = null;

  // get word
  let wordKeys = Object.keys(words);
  let randomWordIndex = Math.floor(Math.random() * WORD_AMOUNT); // a random number for picking a key
  word = words[wordKeys[randomWordIndex]][0]; // pick word
  return word;
}

/**
 * Handles the "random" command
 * sends random word
 * @param {Message} message discord message object
 */
function sendRandomWord(message, updateWordStatus = false) {
  let word = getRandomWord(message); //gets a random word
  sendCustomWord(message, word.word, (isWotd = true));
  console.log("Word obtained: " + word[word]);
}

/**
 * Handles the "word" command
 * user entered a word as parameter, get the word from the dictionary and send it
 * @param {Message} message discord message object
 */
function handleCommandWord(message) {
  const word = message.content.split(" ")[1];
  console.log(`Bot sent word! ${word}`);
  sendCustomWord(message, word);
}

/**
 * Handles the "start" command
 * starts automatic sending wotd messages and updates word status in the file
 * sends a new word every 24 hours (as specified in MSEC_PER_DAY constant)
 * only an admin or moderator can use this command.
 * @param {Message} message discord message object
 */
function handleCommandStart(message) {
  if (checkIfAdmin(message)) {
    console.log("Bot started!");
    //logger.logMessage(message);

    message.channel.send(
      "Bot started! A new word will be posted every 24h from now."
    );

    sendWordOfTheDay(message, true);

    interval = bot.setInterval(sendWordOfTheDay, MSEC_PER_DAY, message, true);
  } else {
    console.log("Bot did not start, user was not a moderator or admin");
    //logger.logMessage(message);

    message.channel.send(
      "Bot did not start, user must be a moderator or admin to use this command."
    );
  }
}

/**
 * Handles the "stop" command
 * stops automatic sending wotd messages
 * only an admin or moderator can use this command.
 * @param {Message} message
 */
function handleCommandStop(message) {
  if (checkIfAdmin(message)) {
    console.log("Bot stopped!");
    //logger.logMessage(message);

    message.channel.send(
      "Bot stopped! New words will not be posted automatically."
    );

    bot.clearInterval(interval);
  } else {
    console.log("Bot did not stop, user was not a moderator or admin");
    //logger.logMessage(message);

    message.channel.send(
      "Bot did not stop, user must be a moderator or admin to use this command."
    );
  }
}

/**
 * Handles the "help" command
 * displays information about the bot commands in chat
 * @param {Message} message
 */
function handleCommandHelp(message) {
  console.log("Bot helped!");

  let help =
    "Commands for the word of the day bot:\n" +
    "```" +
    "$word x  - Searches word x in the dictionary and posts it if available\n" +
    "$start - Starts automatic sending the word of the day - once a day, from current time (requires moderator permissions)\n" +
    "$stop  - Stops automatic sending the word of the day (requires moderator permissions)\n" +
    "$hitme - Starts challenge mode - define randomly picked words within a time limit\n" +
    "$random - Sends a random word in the chat\n" +
    "$goodbot - Shows your appreciation for the bot\n" +
    "$goodboy - Woof!\n" +
    "```";

  message.channel.send(help);
}

/**
 * Checks for timeout - whether it's been too long since last user input.
 * works as a callback and requires a function as parameter
 * @param {Message} message
 * @param {Function} callback
 */
function timeOutCallback(message, callback) {

  console.log("timeout check ran!");

  message.channel.fetchMessages({ limit: 30 }) // fetches last messages in channel up to limit
    .then(messages => {
      let userMessages = messages.filter(msg => !msg.author.bot); // filters out bot messages
      let lastMessage = userMessages.first(); // most recent message
      let timePassed = new Date().getTime() - lastMessage.createdTimestamp; // finds time between the most recent message and now
      console.log(timePassed);
      if (timePassed < TIMEOUT_TIME) { // if too much time has passed with no user input, it automatically terminates the loop
        callback(message); // runs the original function
      } else {
        console.log("Timed out!");
        message.channel.send("Looks like no one's around. Goodbye!");
        return;
      }
    }).catch(console.error);
}

/**
 * Handles the 'hitme' command
 * continuously provides words to translate
 * @param {Message} message
 */
function handleChallengeMode(message) {
  callbackMsg = message;
  timeOutCallback(callbackMsg, function (message) { // checks for timeout

    let wordCheck = false;
    let engWord = null;
    let estWord = null;

    while (!wordCheck) { // because some words lack english translations, it loops until a word with a translation is found
      let randWord = getRandomWord(message); // placeholder
      engWord = randWord["english"]; // a word in english
      estWord = randWord["word"]; // the same word in estonian
      if(engWord !== null && engWord !== "") {
        wordCheck = true;
      }
    }

    console.log("challenge mode ran: " + estWord + ": " + engWord);

    const filter = response => response.content.toLowerCase() === engWord.toLowerCase() // the filter for accepting user input.
      || response.content.toLowerCase() === STOP  // if the user types stop, next or the correct word,
      || response.content.toLowerCase() === NEXT; // it will return true. otherwise false
    message.channel.send("Translate: **" + estWord + "**. (type " + STOP + " to end)").then(() => {
      message.channel.awaitMessages(filter, { maxMatches: 1, time: 15000, errors: ['time'] }) // new message collector which accepts one match, in a certain time limit ('time')
        .then(collected => { // this only runs if the filter returns true

            let input = collected.first().content.toLowerCase() ;
            console.log("challenge mode input received: " + input);

            if (input === STOP) { // if the user entered stop
              message.channel.send('All done!');
              return; // ends the message collector
            } else if (input === NEXT) { // if the user entered 'next'
              message.channel.send('The answer is: **' + engWord + '**'); // fast-fowards to the next word
              handleChallengeMode(message);
            } else {
              message.channel.send(`${collected.first().author} got the correct answer!`);
              handleChallengeMode(message); // runs this same function again
            }
          })
        .catch(collected => { // runs once the error conditions in the message collector are fulfilled - so, only when time runs out
            message.channel.send('The answer I have is: **' + engWord + "**");
          handleChallengeMode(message); // runs this same function again
        });
      });
  });
}

/**
 * handles the given command and executes the bot behaviour
 * @param {Message} message discord message object
 */
function handleCommands(message) {
  let command = getCommandFromMessage(message); // get command string
  console.log(command);

  switch (command) {
    case "random":// user entered $random, send a random word
      sendRandomWord(message);
      break;
    case "wotd": // user entered command "$wotd", send the word of the day in chat
      //handleCommandWotd(message);
      break;
    case "word": // user entered command "$word x", get the word from the dictionary and send it
      handleCommandWord(message);
      break;
    case "start": // user entered command "$start", starts automatic sending wotd messages and updates word status
      handleCommandStart(message);
      break;
    case "stop": // user entered command "$stop", stops automatic sending wotd messages
      handleCommandStop(message);
      break;
    case "hitme":
      handleChallengeMode(message);
      break;
    case "goodbot": // thanks user
      console.log("Bot was a good bot!");
      message.channel.send("Thanks");
      break;
    case "goodboy": // woofs user
      console.log("Bot was a good boy!");
      message.channel.send("Woof!");
      break;
    case "help": // help command
      handleCommandHelp(message);
    default:
      break;
  }
}

module.exports = {
  bot: bot,
  sendWordOfTheDay: sendWordOfTheDay,
  sendCustomWord: sendCustomWord,
  checkIfAdmin: checkIfAdmin,
  getCommandFromMessage: getCommandFromMessage,
  handleCommandWotd: handleCommandWotd,
  handleCommandWord: handleCommandWord,
  handleCommandStart: handleCommandStart,
  handleCommandStop: handleCommandStop,
  handleCommandHelp: handleCommandHelp,
  handleCommands,
  handleCommands
};
