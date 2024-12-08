const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");
const router = express.Router();

const url =
  "https://www.sephora.co.id/categories/clean/clean-skincare?q=skin%20care";

async function scrape() {
  try {
    const { data } = await axios.get(url);
    const dataCare = [];
    const $ = cheerio.load(data);

    $(".products-card-container").each((index, element) => {
      const title = $(element).find(".brand").text().trim();
      const desc = $(element).find(".product-name").text().trim();
      const link =
        "https://www.sephora.co.id" +
        $(element).find(".product-card-description").attr("href").trim();
      const reviews_count = parseInt(
        $(element)
          .find(".reviews-count")
          .text()
          .trim()
          .match(/\(\s*(\d+)\s*\)/)[1]
      );
      const stars = parseFloat(
        $(element)
          .find(".stars")
          .attr("style")
          .match(/--highlighted-percentage:\s*([\d.]+)%/)[1]
      );
      const poster = $(element).find("img").attr("src");

      let product = {
        title,
        poster,
        desc,
        stars,
        reviews_count,
        link,
      };

      dataCare.push(product);
    });

    return dataCare;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}

router.get("/", async (req, res) => {
  const query = req.query.q?.toLowerCase() || "";

  const products = await scrape();

  if (query) {
    const filteredProducts = products.filter((product) =>
      product.title.toLowerCase().includes(query)
    );
    res.json(filteredProducts);
  } else {
    res.json(products);
  }
});

module.exports = router;
