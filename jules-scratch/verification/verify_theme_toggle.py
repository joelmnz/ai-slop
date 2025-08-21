import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the index.html file
        file_path = os.path.abspath('index.html')

        # Go to the local HTML file
        await page.goto(f'file://{file_path}')

        # 1. Take a screenshot of the default theme (dark)
        await page.screenshot(path="jules-scratch/verification/01_dark_mode.png")

        # 2. Click the settings button
        await page.click("#settings-button")
        await page.wait_for_selector("#settings-modal", state="visible")
        await page.wait_for_timeout(500) # wait for animations

        # 3. Click the theme toggle to switch to light mode using JavaScript
        await page.evaluate("document.getElementById('theme-toggle').click()")

        await expect(page.locator("body")).to_have_attribute("data-theme", "light")
        await page.screenshot(path="jules-scratch/verification/02_light_mode.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
