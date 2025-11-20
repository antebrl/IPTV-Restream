const fs = require("fs");
const path = require("path");
const Channel = require("../models/Channel");
const { clear } = require("console");

const storageFilePath = path.resolve(__dirname, "../channels/channels.json");

module.exports = {
  load() {
    const defaultChannels = [
      //Some Test-channels to get started
      new Channel(
        "BBC",
        "https://bcovlive-a.akamaihd.net/7f5ec16d102f4b5d92e8e27bc95ff424/us-east-1/6240731308001/playlist.m3u8",
        "https://upload.wikimedia.org/wikipedia/commons/4/41/BBC_Logo_2021.svg",
        "proxy",
        []
      ),
      new Channel(
        "BeIn Sports",
        "http://fl2.moveonjoy.com/BEIN_SPORTS/index.m3u8",
        "https://github.com/tv-logo/tv-logos/blob/main/countries/united-states/bein-sports-us.png?raw=true",
        "proxy",
        []
      ),
    ];

    if (fs.existsSync(storageFilePath)) {
      try {
        const data = fs.readFileSync(storageFilePath, "utf-8");
        const channelsJson = JSON.parse(data);

        return channelsJson.map((channelJson) => Channel.from(channelJson));
      } catch (err) {
        console.error("Error loading data from storage:", err);
        return defaultChannels;
      }
    }
    this.save(defaultChannels);
    return defaultChannels;
  },

  save(data) {
    try {
      fs.writeFile(
        storageFilePath,
        JSON.stringify(data, null, 2),
        { encoding: "utf-8" },
        (err) => err && console.error(err)
      );
      console.log("Data saved successfully.");
    } catch (err) {
      console.error("Error saving data to storage:", err);
    }
  },

  clear() {
    try {
      fs.unlinkSync(storageFilePath);
      console.log("Data cleared successfully.");
    } catch (err) {
      console.error("Error clearing data from storage:", err);
    }
  },
};
