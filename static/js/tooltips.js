document.addEventListener('DOMContentLoaded', function() {
    const tooltip = document.createElement('div');
    tooltip.className = 'social-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '1000';
    document.body.appendChild(tooltip);

    const socialLinks = document.querySelectorAll('.socials .social');
    
    socialLinks.forEach(link => {
        const img = link.querySelector('img');
        const tooltipText = img.getAttribute('alt');
        
        function show() {
            tooltip.textContent = tooltipText;
            tooltip.style.display = 'block';

            const rect = link.getBoundingClientRect();
            tooltip.style.left = (rect.left + window.scrollX) + 'px';
            tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        }

        function hide() {
            tooltip.style.display = 'none';
        }

        // keyboard focus shows the same tooltip as hovering
        link.addEventListener('mouseenter', show);
        link.addEventListener('focus', show);
        link.addEventListener('mouseleave', hide);
        link.addEventListener('blur', hide);
        
        link.addEventListener('mousemove', function(e) {
            const rect = link.getBoundingClientRect();
            tooltip.style.left = (rect.left + window.scrollX) + 'px';
            tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        });
    });
});
