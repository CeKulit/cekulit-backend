const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");
const router = express.Router();

const url = "https://www.sephora.co.id/categories/clean/clean-skincare?q=skin%20care";

async function scrape() {
    try {
        // Adding headers to avoid 403 error
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Referer': 'https://www.sephora.co.id/',
                'Connection': 'keep-alive'
            },
            withCredentials: true
        });

        const dataCare = [];
        const $ = cheerio.load(data);

        $(".products-card-container").each((index, element) => {
            const title = $(element).find(".brand").text().trim();
            const desc = $(element).find(".product-name").text().trim();
            const link = "https://www.sephora.co.id" + $(element).find(".product-card-description").attr("href")?.trim();
            const reviews_count = parseInt($(element).find(".reviews-count").text().trim().match(/\(\s*(\d+)\s*\)/)?.[1] || 0);
            const stars = parseFloat($(element).find(".stars").attr("style")?.match(/--highlighted-percentage:\s*([\d.]+)%/)?.[1] || 0);
            const poster = $(element).find("img").attr("src");

            dataCare.push({ title, poster, desc, stars, reviews_count, link });
        });

        console.log("Scraping Successful!");
        return dataCare;
    } catch (error) {
        // Improved error handling
        if (error.response) {
            console.error(`HTTP Error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
            console.error("No response received:", error.request);
        } else {
            console.error("Error:", error.message);
        }
        return [];
    }
}

// Adding async function for route handling
router.get("/", async (req, res) => {
    try {
        const products = await scrape();
        const query = req.query.q?.toLowerCase() || "";
        const desc = req.query.desc?.toLowerCase() || "";

        if (query) return res.json(products.filter((p) => p.title.toLowerCase().includes(query)));
        if (desc) return res.json(products.filter((p) => p.desc.toLowerCase().includes(desc)));
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Scraping failed", error: error.message });
    }
});

module.exports = router;