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
        
        link.addEventListener('mouseenter', function(e) {
            tooltip.textContent = tooltipText;
            tooltip.style.display = 'block';

            const rect = link.getBoundingClientRect();
            tooltip.style.left = (rect.left + window.scrollX) + 'px';
            tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        });

        link.addEventListener('mouseleave', function() {
            tooltip.style.display = 'none';
        });
        
        link.addEventListener('mousemove', function(e) {
            const rect = link.getBoundingClientRect();
            tooltip.style.left = (rect.left + window.scrollX) + 'px';
            tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        });
    });
});
