import asyncio
from playwright import async_api

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # Try to find or reveal the mic button to click and request microphone access.
        await page.mouse.wheel(0, window.innerHeight)
        

        await page.mouse.wheel(0, -window.innerHeight)
        

        # Click the mic button to request microphone access and then deny the permission in the browser prompt.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Click the cancel button to stop listening and verify if the UI returns to idle state. Then confirm no speech recognition is active.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/div[2]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Verify a visible toast or error message indicating mic access is needed.
        toast = await page.locator('text=mic access is needed').first()
        assert await toast.is_visible(), 'Expected mic access error message to be visible'
          
        # Verify UI remains or returns to Idle state and no speech recognition starts
        idle_state = await page.locator('text=Tap the microphone icon to start speaking.').first()
        assert await idle_state.is_visible(), 'Expected UI to be in Idle state'
        # Additional check: ensure no speech recognition is active (no audio waveform or listening indicator)
        listening_indicator = await page.locator('css=.listening-indicator').first()
        assert not await listening_indicator.is_visible(), 'Expected no speech recognition to be active'
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    