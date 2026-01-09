#!/usr/bin/env python3
"""
Script to add missing rationales to OpenSpec requirements
"""

import os
import re
import sys

def generate_rationale(req_id, req_title):
    """Generate a contextually appropriate rationale based on requirement ID and title"""

    title_lower = req_title.lower()

    # AI-related requirements
    if 'REQ-AI' in req_id:
        if 'transparency' in title_lower or 'explain' in title_lower:
            return "Users must understand why AI makes suggestions to maintain agency and trust in the system."
        elif 'privacy' in title_lower:
            return "Surveillance capitalism is incompatible with liberation; AI must learn and improve while preserving individual privacy."
        elif 'collective benefit' in title_lower:
            return "Post-scarcity requires abundance thinking; AI should help everyone thrive, not create competition."
        elif 'accessibility' in title_lower or 'multilingual' in title_lower:
            return "Technology must be accessible to all community members regardless of ability or language; inclusive design is justice."
        elif 'bias' in title_lower or 'discrimination' in title_lower:
            return "AI can perpetuate historical discrimination; active anti-bias work ensures equitable access and treatment for all."
        elif 'context' in title_lower or 'conversation' in title_lower:
            return "Humans communicate contextually over time; AI that remembers context provides coherent, helpful assistance."
        elif 'match' in title_lower or 'coordin' in title_lower:
            return "Complex coordination overwhelms humans; AI excels at multi-factor optimization while preserving human agency."
        elif 'proactive' in title_lower or 'suggest' in title_lower:
            return "Reactive systems require users to know what to search for; proactive discovery surfaces opportunities users didn't know existed."
        elif 'load' in title_lower or 'balance' in title_lower:
            return "Burnout harms individuals and communities; intelligent load balancing ensures sustainable participation."
        elif 'conversational' in title_lower or 'natural language' in title_lower:
            return "Natural conversation removes barriers; people should express needs in their own words, not learn system syntax."
        elif 'pattern' in title_lower or 'need' in title_lower:
            return "Identifying patterns helps communities plan proactively rather than reacting to recurring problems."
        elif 'skill gap' in title_lower:
            return "Unmet needs reveal skill gaps; identifying these helps communities build capacity where it's needed most."
        elif 'resource utilization' in title_lower:
            return "Maximizing resource use reduces waste; identifying underutilized assets helps redistribute access."
        elif 'community health' in title_lower:
            return "Healthy communities require attention to collective wellbeing; monitoring enables supportive intervention."
        elif 'adaptation' in title_lower or 'skill' in title_lower:
            return "People have diverse technological comfort; AI should meet users where they are, not force conformity."
        elif 'manipulation' in title_lower:
            return "Liberation requires authentic choice, not engineered compliance; ethical AI respects human autonomy."
        elif 'open source' in title_lower:
            return "Communities should own and understand the AI that serves them, not depend on proprietary black boxes."
        elif 'event' in title_lower:
            return "Fully automated luxury space communism means AI handles the logistics of joy so humans can focus on the celebration."
        else:
            return "AI agents handle coordination work so humans can focus on creativity, connection, and joy—the essence of fully automated luxury space communism."

    # Time banking
    elif 'REQ-TIME' in req_id:
        if 'skill' in title_lower:
            return "Diverse skills meet diverse needs; flexible taxonomies enable communities to describe their actual capacities."
        elif 'match' in title_lower or 'coordinat' in title_lower:
            return "AI can optimize complex time and skill matching that would overwhelm manual coordination."
        elif 'accessibility' in title_lower:
            return "Mutual aid must be accessible to all; accommodating diverse abilities ensures inclusive participation."
        elif 'geographic' in title_lower:
            return "Ultra-local connections build neighborhood resilience and reduce transportation barriers."
        elif 'preference' in title_lower:
            return "Respecting preferences while maintaining flexibility creates satisfying matches without rigid requirements."
        elif 'commun' in title_lower:
            return "Clear communication prevents misunderstandings; good coordination makes helping easy and reliable."
        elif 'participation' in title_lower:
            return "Gentle invitation respects autonomy while building culture where everyone contributes and receives."
        elif 'burnout' in title_lower:
            return "Sustainable participation requires pacing; caring for volunteers ensures long-term community vitality."
        elif 'recognition' in title_lower:
            return "Celebrating contributions builds participation without hierarchy; gratitude strengthens community bonds."
        else:
            return "Time and skill sharing builds community bonds while meeting real needs through cooperation."

    # Resource sharing
    elif 'REQ-SHARE' in req_id:
        if 'tool' in title_lower or 'equipment' in title_lower:
            return "Most tools sit unused; sharing maximizes utility while reducing consumption and building community."
        elif 'space' in title_lower:
            return "Shared spaces enable community activity; coordinated access ensures equitable use."
        elif 'robot' in title_lower or 'autonomous' in title_lower:
            return "Future technologies should be community-owned and shared, not locked behind individual wealth."
        elif 'lifecycle' in title_lower or 'maintenance' in title_lower:
            return "Shared resources require shared responsibility; tracking ensures things stay functional and available."
        elif 'collective' in title_lower or 'ownership' in title_lower:
            return "Collective ownership builds true commons; shared governance ensures resources serve community needs."
        elif 'condition' in title_lower or 'quality' in title_lower:
            return "Transparency about condition prevents disappointment; documentation helps maintain resource quality."
        elif 'skill' in title_lower and 'knowledge' in title_lower:
            return "Tools without knowledge are intimidating; sharing expertise makes resources accessible to all."
        elif 'discover' in title_lower:
            return "The best resources are ones you didn't know existed; intelligent discovery unlocks community abundance."
        elif 'proximity' in title_lower:
            return "Local sharing reduces transportation needs, builds neighborhood connections, and increases resilience."
        elif 'pickup' in title_lower or 'delivery' in title_lower:
            return "Logistics shouldn't be a barrier; coordinated exchange makes sharing actually work."
        elif 'gratitude' in title_lower:
            return "Gratitude without obligation maintains gift economy; appreciation strengthens bonds without creating debt."
        elif 'safety' in title_lower or 'trust' in title_lower:
            return "Community-based safety strengthens bonds; restorative approaches build trust better than punishment."
        elif 'insurance' in title_lower or 'risk' in title_lower:
            return "Transparency about responsibility and mutual aid for accidents maintains trust in sharing systems."
        elif 'skill-appropriate' in title_lower:
            return "Safety and skill requirements protect people and resources; matching expertise to tools prevents harm."
        elif 'energy' in title_lower:
            return "Solarpunk communities generate their own clean energy; sharing excess capacity builds resilience and reduces waste."
        elif 'battery' in title_lower:
            return "Distributed battery storage smooths renewable generation; community coordination maximizes renewable utilization."
        elif 'load' in title_lower:
            return "Timing energy-intensive activities with renewable availability reduces fossil fuel dependence."
        elif 'microgrid' in title_lower:
            return "Community microgrids enable autonomous, resilient operation when centralized systems fail."
        elif 'visibility' in title_lower:
            return "Aggregate visibility enables planning without individual surveillance; community-level data respects privacy."
        else:
            return "Sharing builds community while reducing consumption; commons-based resources serve everyone."

    # Governance
    elif 'REQ-GOV' in req_id:
        if 'community' in title_lower and ('group' in title_lower or 'commune' in title_lower):
            return "From neighborhoods to communes, diverse organizing forms require flexible infrastructure."
        elif 'philosophy' in title_lower or 'values' in title_lower:
            return "Clear values help people find aligned communities and enable informed consent about joining."
        elif 'space' in title_lower or 'land' in title_lower:
            return "Making available spaces visible enables people to find communities and communities to find members."
        elif 'discovery' in title_lower or 'matching' in title_lower:
            return "Values alignment matters more than proximity; intelligent matching helps people find their community."
        elif 'review' in title_lower or 'transparency' in title_lower:
            return "Power imbalances and cult dynamics thrive in secrecy; transparency protects vulnerable people."
        elif 'red flag' in title_lower or 'cult' in title_lower:
            return "Solarpunk utopia means liberation for all, not charismatic leaders exploiting followers."
        elif 'exit' in title_lower:
            return "Freedom includes the right to leave; any community that prevents exit is a prison."
        elif 'conflict' in title_lower:
            return "Healthy communities need accessible conflict resolution; core platform features normalize constructive conflict handling."
        elif 'space' in title_lower and 'listing' in title_lower:
            return "Shared spaces require coordination; clear information enables equitable access and care."
        elif 'maintenance' in title_lower or 'care' in title_lower:
            return "Shared spaces require shared maintenance; coordination prevents tragedy of the commons."
        elif 'harvest' in title_lower:
            return "Coordinating harvest ensures equitable sharing and prevents waste of community labor."
        elif 'garden' in title_lower and 'availability' in title_lower:
            return "Real-time availability helps people harvest at peak ripeness and prevents waste."
        elif 'class' in title_lower or 'workshop' in title_lower:
            return "Shared knowledge builds community capacity and resilience; education strengthens collective power."
        elif 'learning cooperative' in title_lower:
            return "Cooperative education distributes expertise and costs; shared teaching builds strong learning communities."
        elif 'mentorship' in title_lower:
            return "Long-term mentorship develops deep skills; structured programs ensure knowledge transfer."
        elif 'cooperative formation' in title_lower:
            return "Worker and housing cooperatives democratize economy; platform support makes formation accessible."
        elif 'purchasing' in title_lower:
            return "Bulk purchasing achieves economies of scale while maintaining non-monetary internal distribution."
        elif 'unstructured' in title_lower or 'bulletin' in title_lower:
            return "Not everything fits clean categories; humans should be able to express needs naturally."
        elif 'chore' in title_lower:
            return "Transparent, equitable distribution of work prevents burnout and ensures everyone knows how they can help."
        elif 'swap' in title_lower or 'coverage' in title_lower:
            return "Life conflicts happen; easy shift swapping maintains reliability while respecting flexibility."
        elif 'ticket' in title_lower or 'maintenance ticket' in title_lower:
            return "This is an operating system for a commune; tracking maintenance needs ensures nothing falls through the cracks."
        elif 'mediation' in title_lower:
            return "Healthy communities need accessible conflict resolution; core platform features normalize addressing conflicts constructively."
        elif 'democratic' in title_lower:
            return "Democracy requires tools for participation; software should enable not constrain collective decision-making."
        elif 'consent' in title_lower or 'sociocratic' in title_lower:
            return "Consent-based models seek solutions without objections; supporting diverse governance models respects community autonomy."
        elif 'federated' in title_lower:
            return "Nested governance enables local autonomy with regional coordination; federation scales solidarity."
        elif 'inclusive' in title_lower or 'asynchronous' in title_lower:
            return "Everyone deserves voice in decisions; asynchronous and accessible participation removes barriers."
        else:
            return "Democratic governance ensures communities serve their members; tools should enable participatory decision-making."

    # Care and resilience
    elif 'REQ-CARE' in req_id:
        if 'check-in' in title_lower or 'elderly' in title_lower or 'disabled' in title_lower:
            return "Solarpunk communities care for all members; technology should support mutual care without surveillance."
        elif 'emergency' in title_lower or 'alert' in title_lower:
            return "Rapid response to urgent needs saves lives and demonstrates community care in action."
        elif 'gradual' in title_lower or 'recovery' in title_lower:
            return "Care adapts to changing needs; support that scales with recovery respects autonomy and healing."
        elif 'matching' in title_lower:
            return "AI can match care needs with willing caregivers, building relationships while meeting needs."
        elif 'sensor' in title_lower or 'monitoring' in title_lower:
            return "Old phones have sensors; collectively they create valuable environmental data for community safety and planning."
        elif 'weather' in title_lower:
            return "Hyperlocal weather data improves planning and identifies microclimates for gardens and outdoor activities."
        elif 'event' in title_lower and 'environmental' in title_lower:
            return "Early detection of environmental dangers enables protective community response."
        elif 'climate' in title_lower and 'planning' in title_lower:
            return "Long-term local data informs adaptation strategies; communities can plan based on actual conditions."
        elif 'citizen science' in title_lower:
            return "Community data contributes to broader understanding; local monitoring serves both community and science."
        elif 'food' in title_lower:
            return "Food is a right, not a commodity; community coordination ensures no one goes hungry."
        elif 'meal' in title_lower:
            return "Shared meals build community; coordination ensures support reaches those who need it."
        elif 'surplus' in title_lower:
            return "Garden abundance should feed community; coordination prevents waste and addresses food insecurity."
        elif 'emergency' in title_lower and 'coordination' in title_lower:
            return "Disasters test community resilience; coordinated mutual aid response saves lives."
        elif 'mutual aid registry' in title_lower:
            return "Knowing community capacities enables rapid mobilization in emergencies."
        elif 'resilience mapping' in title_lower:
            return "Understanding resources and vulnerabilities enables preparation; mapping builds community readiness."
        elif 'wellbeing' in title_lower:
            return "Mental health is community health; aggregate awareness enables collective care responses."
        elif 'peer support' in title_lower:
            return "Peer support based on shared experience builds connection and reduces isolation."
        elif 'joy' in title_lower or 'celebration' in title_lower:
            return "Post-scarcity is about abundance of joy, not just meeting basic needs; celebrating wins builds community culture."
        else:
            return "Mutual aid means caring for each other; systems should enable collective care and resilience."

    # Food and agriculture
    elif 'REQ-FOOD' in req_id:
        if 'seed' in title_lower:
            return "Seed sovereignty is food sovereignty; communities should control their genetic heritage and preserve biodiversity."
        elif 'plant' in title_lower and ('starts' in title_lower or 'cutting' in title_lower):
            return "Sharing plants multiplies abundance; propagation skills and materials should circulate freely."
        elif 'perennial' in title_lower or 'food forest' in title_lower:
            return "Perennial systems require less work, build soil, and are more resilient to climate chaos."
        elif 'forag' in title_lower:
            return "Wild foods are abundant but require knowledge and ethical harvesting; sharing knowledge builds food security without depleting ecosystems."
        elif 'pollinator' in title_lower:
            return "Pollinators are essential for food production; coordinated habitat creation builds agricultural resilience."
        elif 'urban' in title_lower or 'distributed' in title_lower:
            return "Collectively, small spaces add up to significant food production; coordination prevents duplication and maximizes diversity."
        elif 'pest' in title_lower:
            return "Coordinated organic pest management across gardens is more effective than isolated responses."
        elif 'water' in title_lower or 'irrigation' in title_lower:
            return "Water is precious; shared infrastructure and coordinated use maximizes efficiency."
        elif 'compost' in title_lower:
            return "Compost is essential for regenerative agriculture and should never be wasted in landfills."
        elif 'tool' in title_lower:
            return "Specialized garden tools are expensive and rarely used; sharing makes them accessible to all."
        elif 'preservation' in title_lower:
            return "Preservation is essential for year-round food security; collective work makes big harvests manageable and fun."
        elif 'storage' in title_lower:
            return "Shared storage infrastructure enables food preservation; community facilities serve multiple households."
        elif 'dehydration' in title_lower:
            return "Equipment sharing makes preservation accessible; coordinated processing handles abundance efficiently."
        elif 'harvest planning' in title_lower:
            return "Planning preservation goals prevents winter scarcity; tracking consumption improves future planning."
        elif 'recipe' in title_lower:
            return "Sharing culinary knowledge helps people use seasonal abundance; recipes preserve cultural food traditions."
        elif 'bulk' in title_lower:
            return "Collective purchasing achieves economies of scale; bulk buying makes quality food more affordable."
        elif 'glean' in title_lower:
            return "Vast amounts of food are wasted while people go hungry; coordination can redirect abundance to where it's needed."
        elif 'skill' in title_lower and 'progression' in title_lower:
            return "Everyone can learn to grow food; mentorship and progression build community capacity."
        elif 'specialty' in title_lower:
            return "Deep expertise in specific crops builds community knowledge; specialist circles advance collective practice."
        elif 'seed saving' in title_lower and 'education' in title_lower:
            return "Seed saving skills build sovereignty; comprehensive education creates redundant capacity."
        elif 'experiment' in title_lower:
            return "Experimentation drives improvement; coordinated trials build location-specific knowledge."
        elif 'aquaponics' in title_lower or 'integrated' in title_lower:
            return "Integrated systems create synergies; shared learning accelerates adoption of efficient methods."
        elif 'climate adaptation' in title_lower:
            return "Climate change requires agricultural adaptation; coordinated experimentation finds resilient solutions."
        else:
            return "Food sovereignty and local production build community resilience and food security."

    # Energy and infrastructure
    elif 'REQ-ENERGY' in req_id:
        if 'solar garden' in title_lower or 'community solar' in title_lower:
            return "Not everyone has optimal roof space; shared installations democratize solar access and achieve economies of scale."
        elif 'wind' in title_lower:
            return "Distributed wind generation complements solar; community coordination builds diverse renewable capacity."
        elif 'micro-hydro' in title_lower:
            return "Where water flows, energy can be generated; micro-hydro provides consistent renewable power."
        elif 'human-powered' in title_lower or 'pedal' in title_lower:
            return "Human power is always renewable; combining exercise with energy generation builds culture and capacity."
        elif 'heat pump' in title_lower:
            return "Shared heat pump infrastructure achieves efficiency at scale; collective investment makes technology accessible."
        elif 'weatherization' in title_lower or 'efficiency' in title_lower:
            return "Bulk purchasing reduces costs; shared knowledge and labor makes retrofitting accessible to all."
        elif 'skill share' in title_lower:
            return "DIY skills enable household improvements; education builds capacity and reduces costs."
        elif 'thermal imaging' in title_lower:
            return "Expensive equipment shared across community makes energy audits accessible to all."
        elif 'passive solar' in title_lower:
            return "Passive strategies require knowledge not money; education enables zero-cost comfort improvements."
        elif 'vehicle sharing' in title_lower or 'ev' in title_lower:
            return "Most vehicles sit unused 95% of the time; sharing maximizes utility and reduces resource consumption."
        elif 'bike' in title_lower:
            return "Bikes enable human-scale transportation; shared infrastructure and skills make cycling accessible."
        elif 'route' in title_lower:
            return "Local knowledge makes active transportation safer; shared routes build biking and walking culture."
        elif 'transit' in title_lower:
            return "Public transit works better together; coordination builds ridership and supports transit advocacy."
        elif 'cargo bike' in title_lower:
            return "Cargo bikes can replace car trips; shared access and skills enable fossil-free logistics."
        elif 'backup' in title_lower or 'resilience' in title_lower:
            return "Distributed backup power creates community resilience; coordination enables mutual aid during outages."
        elif 'load shift' in title_lower:
            return "Timing energy use with renewable generation reduces fossil fuel dependence; coordination maximizes clean energy."
        elif 'monitoring' in title_lower or 'transparency' in title_lower:
            return "Community-wide visibility enables planning and optimization while preserving household privacy."
        elif 'governance' in title_lower or 'cooperative' in title_lower:
            return "Democratic governance of energy systems builds energy democracy; communities should control their power."
        elif 'justice' in title_lower or 'access' in title_lower:
            return "Energy is a right; solarpunk communities ensure universal access to clean, affordable energy."
        elif 'utility' in title_lower:
            return "Collective action builds political power; organized communities can push utilities toward renewable energy."
        elif 'electrification' in title_lower or 'heat pump conversion' in title_lower:
            return "Eliminating fossil fuel use requires electrification; coordination makes transition affordable."
        elif 'induction' in title_lower:
            return "Gas cooking harms health and climate; supporting electric alternatives enables complete fossil fuel elimination."
        elif 'charging' in title_lower:
            return "EV adoption requires charging infrastructure; community coordination ensures equitable access."
        elif 'literacy' in title_lower:
            return "Energy literacy builds agency; informed communities make better energy decisions."
        elif 'diy' in title_lower and 'renewable' in title_lower:
            return "Hands-on experience demystifies technology; DIY builds confidence and understanding."
        else:
            return "Renewable energy, efficiency, and reduced consumption enable community energy independence."

    # Water and ecology
    elif 'REQ-WATER' in req_id:
        if 'rainwater' in title_lower:
            return "Every roof is a watershed; capturing rainwater reduces stormwater runoff, recharges groundwater, and builds water independence."
        elif 'greywater' in title_lower:
            return "Greywater reuse reduces consumption; coordinated systems make water go further."
        elif 'cistern' in title_lower:
            return "Shared water storage builds drought resilience; community infrastructure serves multiple households."
        elif 'well' in title_lower or 'spring' in title_lower:
            return "Understanding local water sources builds resilience but must be balanced with aquifer health."
        elif 'quality' in title_lower and 'testing' in title_lower:
            return "Community-based monitoring detects contamination early; shared testing builds water knowledge."
        elif 'drought' in title_lower:
            return "Climate change brings increased drought; proactive preparation builds water security."
        elif 'native plant' in title_lower:
            return "Native plants support biodiversity, require less water, and rebuild ecosystem health."
        elif 'invasive' in title_lower:
            return "Invasive species degrade ecosystems; coordinated removal and native restoration rebuilds health."
        elif 'stream' in title_lower:
            return "Healthy streams support biodiversity, filter water, recharge aquifers, and provide community amenities."
        elif 'wildlife' in title_lower:
            return "Wildlife habitat creates biodiversity; coordinated creation connects fragments into functional corridors."
        elif 'biodiversity' in title_lower:
            return "Tracking biodiversity over time reveals ecosystem health; citizen science contributes to conservation."
        elif 'tree' in title_lower:
            return "Trees provide shade, clean air, sequester carbon, build soil, and create habitat; caring for trees builds ecological connection."
        elif 'repair' in title_lower:
            return "Repair extends product life, builds skills, saves money, and creates culture of stewardship over disposal."
        elif 'upcycl' in title_lower or 'reuse' in title_lower:
            return "Creative reuse prevents waste; material exchange builds culture of resourcefulness."
        elif 'mending' in title_lower or 'textile' in title_lower:
            return "Mending extends clothing life; circles make repair social and skills accessible."
        elif 'zero waste' in title_lower:
            return "Waste reduction requires education and support; collective challenges build sustainable practices."
        elif 'clothing swap' in title_lower:
            return "Swaps enable wardrobe renewal without consumption; sharing reduces textile waste."
        elif 'symbiosis' in title_lower:
            return "In circular economy, waste is just a resource in the wrong place; coordination closes loops."
        elif 'soil' in title_lower:
            return "Soil health determines growing capacity; monitoring and improvement build long-term productivity."
        elif 'sheet mulch' in title_lower:
            return "Sheet mulching converts lawn to productive land; collective action transforms landscapes."
        elif 'worm' in title_lower or 'vermi' in title_lower:
            return "Worms transform food scraps into fertility; sharing worms and knowledge builds soil biology."
        elif 'ecological literacy' in title_lower:
            return "Understanding local ecosystems builds connection and stewardship; bioregional identity grounds communities."
        elif 'wilderness' in title_lower:
            return "Wilderness skills build confidence and connection; ethical harvesting respects and honors nature."
        elif 'permaculture' in title_lower:
            return "Permaculture design creates regenerative systems; education builds capacity for transformation."
        elif 'water-energy' in title_lower:
            return "Water and energy systems are interconnected; integrated planning optimizes both."
        else:
            return "Water conservation, ecosystem restoration, and waste reduction build ecological resilience."

    # Housing
    elif 'REQ-HOUSING' in req_id:
        if 'cohousing' in title_lower:
            return "Co-housing combines privacy with community, reduces resource use through sharing, and creates built environments for mutual support."
        elif 'land trust' in title_lower:
            return "Land speculation drives housing unaffordability; community ownership ensures housing serves people not profit."
        elif 'tiny house' in title_lower:
            return "Tiny houses offer affordable, low-impact housing; village models build community while reducing costs."
        elif 'adu' in title_lower or 'accessory dwelling' in title_lower:
            return "ADUs increase housing supply on existing land; matching creates housing while building community."
        elif 'intergenerational' in title_lower:
            return "Elders have space and wisdom; younger people have energy and companionship; together they reduce isolation and build resilience."
        elif 'natural building' in title_lower:
            return "Natural building uses local, non-toxic, low-carbon materials; sharing knowledge makes sustainable construction accessible."
        elif 'material' in title_lower and 'sourcing' in title_lower:
            return "Local, natural materials reduce embodied energy; coordinated sourcing builds supply networks."
        elif 'green roof' in title_lower or 'living wall' in title_lower:
            return "Green infrastructure provides cooling, stormwater management, and habitat; shared skills enable widespread adoption."
        elif 'reclaimed' in title_lower or 'salvage' in title_lower:
            return "Demolition creates waste; salvage creates resources and preserves embodied energy."
        elif 'owner-builder' in title_lower:
            return "Self-building reduces costs dramatically; peer networks make it accessible to more people."
        elif 'parklet' in title_lower:
            return "Streets belong to people, not just cars; reclaiming space for sitting, playing, and gathering builds community."
        elif 'library' in title_lower or 'community box' in title_lower:
            return "Sharing infrastructure in public space normalizes gift economy and builds neighborhood culture."
        elif 'art' in title_lower or 'mural' in title_lower:
            return "Public art creates beauty and identity; participatory creation builds ownership and pride."
        elif 'guerrilla' in title_lower:
            return "Unused land can become beauty and food; sometimes asking forgiveness is easier than permission."
        elif 'alley' in title_lower or 'courtyard' in title_lower:
            return "Underutilized alley space can become shared community gathering places."
        elif 'conversion' in title_lower or 'adaptive reuse' in title_lower:
            return "Empty buildings represent waste; conversion creates housing and community space."
        elif 'commercial kitchen' in title_lower or 'shared commercial' in title_lower:
            return "Shared commercial infrastructure enables small-scale production; collective facilities reduce barriers to entry."
        elif 'tenant' in title_lower:
            return "Housing is a human right; collective tenant power protects people from displacement and exploitation."
        elif 'displacement' in title_lower or 'gentrification' in title_lower:
            return "Displacement destroys communities; organized resistance and alternatives protect housing rights."
        elif 'co-op' in title_lower and 'housing' in title_lower:
            return "Resident ownership removes housing from speculative market; cooperatives build permanent affordability."
        elif 'accessibility' in title_lower and 'retrofit' in title_lower:
            return "Accessibility enables aging in place and independence; collective support makes modifications affordable."
        elif 'universal design' in title_lower:
            return "Universal design serves everyone from the start; education prevents costly retrofits."
        elif 'building code' in title_lower:
            return "Overly restrictive codes prevent sustainable, affordable housing; collective advocacy can reform regulations."
        elif 'zoning' in title_lower:
            return "Exclusionary zoning prevents density and diversity; reform enables affordable housing types."
        else:
            return "Alternative housing models and community ownership make housing affordable and sustainable."

    # Culture, tech, health
    elif 'REQ-CULTURE' in req_id or 'REQ-TECH' in req_id or 'REQ-HEALTH' in req_id:
        if 'archive' in title_lower or 'history' in title_lower:
            return "Communities have rich histories that deserve preservation; documenting stories builds connection and identity."
        elif 'knowledge' in title_lower and 'local' in title_lower:
            return "Place-based knowledge is precious and endangered; documentation preserves wisdom while respecting cultural protocols."
        elif 'indigenous' in title_lower or 'land acknowledgment' in title_lower:
            return "All land is Indigenous land; solarpunk communities must practice solidarity and accountability with original peoples."
        elif 'community archive' in title_lower:
            return "Accessible archives make history available to all; organized materials build collective memory."
        elif 'workshop' in title_lower or 'maker' in title_lower:
            return "Shared workshops reduce individual tool ownership needs; collective spaces build making community."
        elif 'fabrication' in title_lower or 'fab lab' in title_lower:
            return "Digital fabrication democratizes production; community labs make advanced tools accessible."
        elif 'art studio' in title_lower or 'creative' in title_lower:
            return "Creative spaces enable artistic expression; shared access removes financial barriers to art-making."
        elif 'music' in title_lower and 'practice' in title_lower:
            return "Practice spaces enable musicians to develop skills; sound isolation makes loud practice considerate."
        elif 'library of things' in title_lower:
            return "Most specialty items are rarely used; sharing makes them accessible while reducing consumption."
        elif 'instrument' in title_lower:
            return "Musical instruments are expensive barriers; lending removes financial obstacles to music education."
        elif 'electronics' in title_lower and 'lab' in title_lower:
            return "Electronics labs enable repair and creation; shared equipment builds technological self-sufficiency."
        elif 'arduino' in title_lower or 'microcontroller' in title_lower:
            return "Hardware programming enables automation and sensing; accessible education demystifies computing."
        elif 'mesh' in title_lower and 'hardware' in title_lower:
            return "Communications resilience requires community-owned infrastructure; teaching builds capacity."
        elif 'solar' in title_lower and 'diy' in title_lower:
            return "Hands-on solar experience builds confidence; DIY skills enable self-sufficiency."
        elif 'lab' in title_lower and 'community' in title_lower:
            return "Science should be accessible to all, not locked in institutions; community labs democratize knowledge creation."
        elif 'fermentation' in title_lower or 'mycology' in title_lower:
            return "Fermentation and fungi provide food and medicine; shared knowledge and cultures build capacity."
        elif 'herb' in title_lower and 'medicin' in title_lower:
            return "Plant medicine is accessible, sustainable, and empowering when practiced safely and knowledgeably."
        elif 'soil biology' in title_lower:
            return "Understanding soil life improves growing; microscopy makes invisible ecosystems visible."
        elif 'biogas' in title_lower:
            return "Biogas captures energy from waste; digesters close nutrient and energy loops."
        elif 'health worker' in title_lower:
            return "Professional healthcare is necessary but insufficient; peer health support builds resilience and prevention."
        elif 'first aid' in title_lower or 'emergency response' in title_lower:
            return "Communities with emergency response capacity save lives; training builds resilient response networks."
        elif 'herbal medicine' in title_lower and 'workshop' in title_lower:
            return "Herbal medicine traditions offer accessible healing; education must emphasize safety and respect for knowledge holders."
        elif 'harm reduction' in title_lower:
            return "Prohibition and criminalization increase harm; harm reduction saves lives and respects autonomy."
        elif 'reproductive' in title_lower:
            return "Reproductive healthcare is a right; community support ensures access regardless of policy or resources."
        elif 'bodywork' in title_lower or 'somatic' in title_lower:
            return "Bodywork supports healing and wellness; time bank exchange makes it accessible beyond market rates."
        elif 'meditation' in title_lower:
            return "Meditation supports mental health and presence; collective practice builds contemplative community."
        elif 'traditional healing' in title_lower:
            return "Many cultures have healing traditions; sharing requires respect, attribution, and often permission from knowledge holders."
        elif 'sauna' in title_lower or 'bathhouse' in title_lower:
            return "Communal bathing builds health and community; shared heat therapy provides accessible wellness."
        elif 'movement' in title_lower and 'practices' in title_lower:
            return "Movement supports physical and mental health; accessible offerings remove financial barriers."
        elif 'disability' in title_lower and 'mutual aid' in title_lower:
            return "Disabled people are experts in their own needs; peer support honors this while building collective care."
        elif 'assistive technology' in title_lower:
            return "Assistive technology should be affordable and accessible; DIY and sharing remove barriers."
        elif 'accessibility advocacy' in title_lower:
            return "Disabled people must lead accessibility work; nothing about us without us."
        elif 'ableism' in title_lower:
            return "Dismantling ableism requires education and practice; disability justice builds truly inclusive communities."
        elif 'seasonal' in title_lower or 'festival' in title_lower:
            return "Celebrations build culture, connection, and joy; marking seasons connects to earth cycles."
        elif 'rites of passage' in title_lower:
            return "Meaningful transitions require ritual; community-created ceremonies honor life stages."
        elif 'death' in title_lower:
            return "Industrial culture hides death and privatizes grief; reclaiming death rituals builds healthy relationship with mortality."
        elif 'theater' in title_lower:
            return "Theater tells stories and builds community; collective creation makes art accessible to all."
        elif 'play' in title_lower:
            return "Adults need play too; solarpunk means reclaiming joy, creativity, and non-productive fun."
        else:
            return "Community culture, accessible technology, and holistic health build flourishing, autonomous communities."

    # Economic solidarity
    elif 'REQ-ECON' in req_id or 'REQ-SOLIDARITY' in req_id:
        if 'resource-based' in title_lower:
            return "Money abstracts away actual resource use and needs; tracking real resources enables post-scarcity planning."
        elif 'contribution visibility' in title_lower:
            return "Recognizing contributions builds participation and gratitude; visibility without obligation maintains gift economy."
        elif 'mutual credit' in title_lower:
            return "Mutual credit enables exchange without external money; trust-based systems build economic autonomy."
        elif 'gift economy' in title_lower:
            return "Gift economy creates stronger bonds than market exchange; teaching these principles builds post-capitalist culture."
        elif 'cooperative' in title_lower and 'incubation' in title_lower:
            return "Worker cooperatives democratize the workplace and keep wealth in community; support makes them accessible."
        elif 'shared services' in title_lower:
            return "Pooling professional services reduces overhead; shared infrastructure enables small cooperative businesses."
        elif 'inter-cooperative' in title_lower:
            return "Cooperatives cooperating with each other builds solidarity economy and collective power."
        elif 'workplace' in title_lower and 'democratic' in title_lower:
            return "Democratic workplace skills enable cooperative enterprise; education transforms workplace relationships."
        elif 'crowdfunding' in title_lower:
            return "Collective investment builds shared ownership; crowdfunding enables community-scale projects."
        elif 'resource pooling' in title_lower:
            return "Pooling resources achieves scale; collective purchasing creates community productive capacity."
        elif 'community-owned' in title_lower:
            return "Community ownership keeps wealth local; democratic enterprises serve community needs."
        elif 'financing' in title_lower and 'cooperative' in title_lower:
            return "Solidarity financing avoids extractive debt; patient capital enables cooperative development."
        elif 'preferential' in title_lower:
            return "Supporting cooperative and community businesses builds alternative economy and keeps wealth circulating locally."
        elif 'mapping' in title_lower and 'solidarity' in title_lower:
            return "Mapping makes alternatives visible; seeing the ecosystem enables connections and growth."
        elif 'supply chain' in title_lower:
            return "Ethical supply chains ensure fair labor and democratic governance; alternatives to corporate chains build economic justice."
        elif 'movement' in title_lower and 'connection' in title_lower:
            return "Local mutual aid connects to global struggle; solidarity means coordinated action for systemic change."
        elif 'resource sharing between' in title_lower:
            return "Inter-community solidarity builds resilience; reciprocal aid strengthens movement networks."
        elif 'strike' in title_lower:
            return "Workers withholding labor is powerful; community support makes strikes sustainable and winnable."
        elif 'eviction' in title_lower or 'housing defense' in title_lower:
            return "Housing is a human right; collective action can prevent displacement and homelessness."
        elif 'land back' in title_lower:
            return "All land is Indigenous land; settlers must practice accountability and rematriation."
        elif 'reparations' in title_lower:
            return "Historical and ongoing harm requires repair; reparations mean redistributing resources and power."
        elif 'transformative justice' in title_lower:
            return "Prisons don't create justice or healing; communities can address harm through accountability and transformation."
        elif 'anti-racist' in title_lower:
            return "Dismantling racism requires ongoing work; BIPOC leadership builds racial justice."
        elif 'direct action' in title_lower:
            return "Direct action disrupts business-as-usual and builds power; strategic action creates material change."
        elif 'divestment' in title_lower:
            return "Financial pressure weakens fossil fuel industry; divestment campaigns build climate movement."
        elif 'political' in title_lower and 'organizing' in title_lower:
            return "Systemic change requires political power; organized communities can win policy victories."
        elif 'climate strike' in title_lower:
            return "Mass mobilization builds climate movement; local participation connects to global action."
        elif 'just transition' in title_lower:
            return "Climate justice requires ensuring workers and communities aren't left behind in transition."
        else:
            return "Economic democracy, solidarity networks, and movement building enable systemic transformation."

    # AI integration (deployment/architecture)
    elif 'REQ-AI-ARCH' in req_id or 'REQ-AI-RESOURCE' in req_id or 'REQ-AI-TIME' in req_id or 'REQ-AI-HEALTH' in req_id or 'REQ-AI-FOOD' in req_id or 'REQ-AI-ENERGY' in req_id or 'REQ-AI-LEARN' in req_id or 'REQ-AI-EVENT' in req_id or 'REQ-AI-EMERGENCY' in req_id or 'REQ-AI-GOV' in req_id or 'REQ-AI-DATA' in req_id or 'REQ-AI-NLU' in req_id or 'REQ-AI-META' in req_id:
        if 'multi-agent' in title_lower:
            return "Different tasks require different expertise and context; coordinated specialists work better than one generalist."
        elif 'context' in title_lower or 'memory' in title_lower:
            return "Humans communicate contextually over time; persistent memory enables coherent assistance."
        elif 'privacy' in title_lower and 'learning' in title_lower:
            return "Agents improve with data, but surveillance capitalism is incompatible with liberation."
        elif 'anticipatory' in title_lower or 'proactive' in title_lower:
            return "The best suggestions are ones you didn't know to ask for; anticipatory discovery unlocks hidden abundance."
        elif 'cross-domain' in title_lower:
            return "Complex needs span multiple domains; intelligent assembly creates comprehensive solutions."
        elif 'temporal' in title_lower or 'opportunity' in title_lower:
            return "Time-sensitive opportunities require rapid detection; alerts enable capturing fleeting abundance."
        elif 'underutilization' in title_lower:
            return "Maximizing resource use reduces waste; detecting underuse enables redistribution."
        elif 'optimal scheduling' in title_lower:
            return "Complex multi-factor optimization overwhelms humans; AI excels at constraint satisfaction."
        elif 'conflict prevention' in title_lower or 'overlap' in title_lower:
            return "Catching conflicts early prevents problems; proactive detection enables better planning."
        elif 'burnout' in title_lower:
            return "Sustainable participation requires monitoring load; care for volunteers ensures long-term vitality."
        elif 'shift coverage' in title_lower:
            return "Last-minute needs happen; intelligent matching finds coverage quickly."
        elif 'energy sensing' in title_lower or 'community energy' in title_lower:
            return "Communities have collective emotional states; detecting low energy enables supportive responses."
        elif 'isolation' in title_lower:
            return "Social isolation harms health; detecting absence enables caring reconnection."
        elif 'conflict early warning' in title_lower:
            return "Addressing tension early prevents escalation; proactive support enables healthy resolution."
        elif 'care need' in title_lower and 'anticipation' in title_lower:
            return "Life transitions create predictable needs; anticipation enables proactive community care."
        elif 'harvest prediction' in title_lower:
            return "Predicting harvest timing enables preparation; coordinated processing prevents waste."
        elif 'food security gap' in title_lower:
            return "Identifying gaps early enables intervention; monitoring ensures year-round food access."
        elif 'crop failure' in title_lower:
            return "Early detection of crop stress enables response; distributed monitoring catches problems quickly."
        elif 'meal planning' in title_lower:
            return "Seasonal meal planning uses abundance; recipes help people enjoy what's available."
        elif 'predictive load' in title_lower:
            return "Predicting generation and usage optimizes storage and load management."
        elif 'energy emergency' in title_lower:
            return "Rapid coordination during outages saves food and enables mutual aid."
        elif 'efficiency opportunity' in title_lower:
            return "Identifying efficiency improvements enables targeted upgrades; data-driven recommendations prioritize impact."
        elif 'renewable expansion' in title_lower:
            return "Strategic renewable planning maximizes impact; analysis guides investment toward independence."
        elif 'personalized learning' in title_lower:
            return "Everyone learns differently; personalized pathways accelerate skill development."
        elif 'skill gap identification' in title_lower:
            return "Unmet needs reveal gaps; proactive education builds community capacity."
        elif 'knowledge preservation' in title_lower:
            return "Elder knowledge is precious and endangered; documentation preserves wisdom for future generations."
        elif 'just-in-time learning' in title_lower:
            return "Learning sticks when immediately applied; timely resources accelerate project success."
        elif 'occasion-based' in title_lower:
            return "Celebrations build culture; proactive suggestions ensure occasions are marked."
        elif 'music matching' in title_lower:
            return "Musical taste matching creates satisfying events; balanced lineups serve diverse preferences."
        elif 'intergenerational' in title_lower:
            return "Events for all ages require intentional design; AI can ensure inclusive programming."
        elif 'post-event' in title_lower:
            return "Learning from experience improves future events; feedback enables continuous improvement."
        elif 'crisis pattern' in title_lower:
            return "Early warning enables preparation; detecting crisis patterns activates response protocols."
        elif 'resource mobilization' in title_lower:
            return "Emergencies require rapid mobilization; AI can coordinate complex crisis response."
        elif 'disaster preparation' in title_lower:
            return "Preparation saves lives; risk-based planning builds community readiness."
        elif 'decision process' in title_lower:
            return "Democratic decisions improve with clear synthesis; AI can surface consensus and concerns."
        elif 'impact analysis' in title_lower:
            return "Understanding consequences enables better decisions; forecasting reveals trade-offs."
        elif 'participation equity' in title_lower:
            return "Democracy requires diverse voices; monitoring ensures marginalized people are heard."
        elif 'trend identification' in title_lower:
            return "Long-term patterns reveal opportunities; trend analysis guides strategic development."
        elif 'anomaly' in title_lower:
            return "Anomalies signal problems or opportunities; detection enables investigation and learning."
        elif 'cross-community' in title_lower:
            return "Communities can learn from each other's successes without sharing sensitive data."
        elif 'multilingual' in title_lower:
            return "Language shouldn't be a barrier; multilingual support ensures equitable access."
        elif 'accessibility' in title_lower and 'communication' in title_lower:
            return "Communication should work for all abilities; adaptive interaction ensures inclusion."
        elif 'tone' in title_lower or 'style' in title_lower:
            return "Context determines appropriate communication; adaptive tone builds better connection."
        elif 'self-improvement' in title_lower:
            return "Learning from use improves assistance; continuous improvement serves communities better."
        elif 'failure learning' in title_lower:
            return "Mistakes teach valuable lessons; learning from failure builds better systems."
        elif 'community-directed' in title_lower:
            return "AI should serve the community, not shareholders or advertisers; democratic control ensures alignment."
        else:
            return "Intelligent automation handles coordination complexity while preserving human agency and joy."

    # Deployment
    elif 'REQ-DEPLOY' in req_id:
        if 'termux' in title_lower:
            return "Everyone should be able to participate regardless of device age or resources."
        elif 'minimal resource' in title_lower:
            return "The platform must work on constrained devices; efficiency enables universal access."
        elif 'progressive web' in title_lower or 'pwa' in title_lower:
            return "PWAs work across devices and offline; web technology ensures broad compatibility."
        elif 'energy efficiency' in title_lower:
            return "Solarpunk means running on clean energy; devices must be energy-efficient to run on limited solar charging."
        elif 'offline' in title_lower:
            return "The platform must work without internet; offline-first ensures resilience."
        elif 'meshtastic' in title_lower:
            return "Resilient communities need communication systems that don't depend on centralized infrastructure or corporate networks."
        elif 'dtn' in title_lower or 'delay tolerant' in title_lower:
            return "In disaster, rural, or infrastructure-poor environments, networks are intermittent; DTN ensures information still flows."
        elif 'peer-to-peer' in title_lower:
            return "Direct device-to-device sync eliminates dependence on central servers."
        elif 'value flows' in title_lower:
            return "Value Flows provides well-designed ontology for non-monetary economic coordination; adopting standards enables interoperability."
        elif 'local-first' in title_lower:
            return "Local-first architecture enables offline operation and peer-to-peer sync without central coordination."
        elif 'sovereignty' in title_lower or 'data sovereignty' in title_lower:
            return "Communities should own their data, not depend on corporate platforms or centralized control."
        elif 'portability' in title_lower:
            return "People move between communities; data portability enables continuity and reputation transfer."
        elif 'activitypub' in title_lower:
            return "Solarpunk networks should be interoperable, not isolated; ActivityPub is the standard for federated social systems."
        elif 'api' in title_lower:
            return "Integration with other tools extends functionality; well-documented APIs enable ecosystem development."
        elif 'import' in title_lower:
            return "Migration from existing platforms should be smooth; import tools enable community transitions."
        elif 'encryption' in title_lower:
            return "Privacy requires encryption; end-to-end security prevents unauthorized access."
        elif 'decentralized identity' in title_lower:
            return "Users should control their identity; decentralized systems prevent vendor lock-in."
        elif 'privacy by design' in title_lower:
            return "Privacy should be default not optional; minimal data collection respects autonomy."
        elif 'easy' in title_lower and 'deployment' in title_lower:
            return "Communities without deep technical expertise should be able to self-host; accessibility enables adoption."
        elif 'resilient' in title_lower:
            return "Infrastructure failures shouldn't break the platform; graceful degradation ensures continuity."
        elif 'multi-platform' in title_lower:
            return "People use diverse devices; cross-platform support ensures universal access."
        elif 'health monitoring' in title_lower:
            return "Communities need visibility into system health; monitoring enables maintenance without surveillance."
        elif 'automatic updates' in title_lower:
            return "Security requires patching; automatic updates balance security with community control."
        elif 'backup' in title_lower:
            return "Data loss destroys community memory; simple backup enables disaster recovery."
        elif 'lightweight' in title_lower:
            return "Performance on slow networks and old devices requires optimization; efficiency enables universal access."
        elif 'scalable' in title_lower:
            return "Communities range from dozens to thousands; the platform must scale efficiently."
        else:
            return "The platform must work in resource-constrained environments; accessibility and resilience are fundamental."

    # Future/experimental
    elif 'REQ-FUTURE' in req_id or 'REQ-EXPERIMENT' in req_id or 'REQ-RESILIENCE' in req_id or 'REQ-COMM' in req_id or 'REQ-SOVEREIGNTY' in req_id or 'REQ-META' in req_id:
        if 'drone' in title_lower and 'delivery' in title_lower:
            return "Autonomous drones can deliver medicine, food, supplies while reducing vehicle traffic; community ownership ensures democratic control."
        elif 'drone' in title_lower and 'agricultural' in title_lower:
            return "Aerial monitoring enables precision agriculture; early detection of problems enables targeted response."
        elif 'cleaning robot' in title_lower:
            return "Automated cleaning reduces drudgery; shared robots serve multiple households efficiently."
        elif 'autonomous vehicle' in title_lower:
            return "If/when autonomous vehicles exist, they should be community-owned and shared, not corporate robot taxis."
        elif 'bioprinting' in title_lower:
            return "Bioprinting could democratize medical technology; community control prevents monopolization."
        elif 'molecular assembler' in title_lower:
            return "If molecular assembly becomes real, it must be community-controlled for true post-scarcity."
        elif 'recycling robot' in title_lower:
            return "Automated sorting closes material loops; robots can separate materials more effectively than humans."
        elif 'mycelium' in title_lower:
            return "Mycelium grows into shapes, is compostable, requires minimal energy—perfect for solarpunk manufacturing."
        elif 'lab-grown' in title_lower:
            return "Cellular agriculture eliminates animal harm; community production democratizes material access."
        elif 'weather balloon' in title_lower:
            return "Atmospheric research builds scientific capacity; accessible aerospace engages youth."
        elif 'amateur radio' in title_lower and 'satellite' in title_lower:
            return "Radio and satellite enable communications resilience independent of corporate infrastructure."
        elif 'decentralized internet' in title_lower or 'satellite internet' in title_lower:
            return "Decentralized satellite networks escape corporate ISP control; community ground stations enable autonomy."
        elif 'climate modeling' in title_lower:
            return "Local climate modeling enables data-driven adaptation; simulation reveals best strategies."
        elif 'asteroid mining' in title_lower:
            return "If asteroid mining becomes real, it must benefit humanity not just billionaires."
        elif 'autonomous zone' in title_lower or 'taz' in title_lower:
            return "Temporary experiments let us practice future social forms with lower stakes and higher creativity."
        elif 'street reclamation' in title_lower or 'street party' in title_lower:
            return "Reclaiming streets demonstrates alternative uses; temporary car-free zones prefigure permanent change."
        elif 'occupation' in title_lower:
            return "Empty buildings while people are homeless is violence; occupations create housing and challenge property relations."
        elif 'festival convergence' in title_lower:
            return "Gatherings build movement relationships; skill-sharing strengthens network capacity."
        elif 'prefiguration' in title_lower:
            return "The platform should embody the values it enables; building it is practicing the future."
        elif 'speculative design' in title_lower:
            return "Imagining alternatives makes them possible; design fiction bridges present to future."
        elif 'radical experimentation' in title_lower:
            return "Innovation requires permission to fail; experimentation spaces enable creative risk-taking."
        elif 'community defense' in title_lower or 'safety team' in title_lower:
            return "Police don't create safety for marginalized people; communities can build safety through solidarity and de-escalation."
        elif 'de-escalation' in title_lower:
            return "Conflict resolution skills prevent violence; training builds peaceful community capacity."
        elif 'harm reduction' in title_lower and 'accountability' in title_lower:
            return "Transformative justice addresses harm without carcerality; community accountability builds healing."
        elif 'ham radio network' in title_lower:
            return "Ham radio works when everything else fails; community radio capacity builds resilience."
        elif 'mesh' in title_lower and 'wifi' in title_lower:
            return "Community-owned networks enable internet independence; mesh topology resists censorship and centralization."
        elif 'sneakernet' in title_lower:
            return "Sometimes sneakernet (walking data on storage devices) is more secure or necessary than digital transmission."
        elif 'dead drop' in title_lower:
            return "Dead drops enable secure asynchronous communication; physical message systems resist digital surveillance."
        elif 'food sovereignty' in title_lower:
            return "Food sovereignty means democratic control over food systems; communities should feed themselves."
        elif 'medicine sovereignty' in title_lower:
            return "Pharmaceutical dependence creates vulnerability; community medicine-making builds health autonomy."
        elif 'water independence' in title_lower:
            return "Water sovereignty requires local sources and storage; independence builds drought resilience."
        elif 'energy autonomy' in title_lower:
            return "Energy independence enables true autonomy; 100% renewable eliminates dependence on extractive systems."
        elif 'digital sovereignty' in title_lower:
            return "Digital sovereignty means owning our tools, data, and communications infrastructure."
        elif 'commune os' in title_lower or 'operating system' in title_lower:
            return "This isn't an app—it's infrastructure for running communities cooperatively."
        elif 'continuous evolution' in title_lower:
            return "Communities evolve unpredictably; the platform must adapt rather than constrain."
        elif 'replication' in title_lower or 'federation' in title_lower:
            return "Every community should be able to fork, modify, and run their own instance while connecting to broader networks."
        else:
            return "Experimentation, resilience, and prefigurative politics enable communities to practice the future now."

    # Default fallback
    else:
        return "This requirement supports community autonomy, mutual aid, and building post-scarcity resilience."

# Process each file
print("Starting to add rationales...")
for filename in sorted([f for f in os.listdir('.') if f.endswith('.md')]):
    print(f"\nProcessing {filename}...")

    with open(filename, 'r') as f:
        content = f.read()

    # Find requirements missing rationales
    lines = content.split('\n')
    new_lines = []
    i = 0
    changes_made = 0

    while i < len(lines):
        line = lines[i]
        new_lines.append(line)

        # Check if this is a requirement header
        if line.startswith('### REQ-'):
            req_match = re.match(r'### (REQ-[A-Z]+-\d+):(.*)', line)
            if req_match:
                req_id = req_match.group(1)
                req_title = req_match.group(2).strip()

                # Look ahead to see if there's already a rationale
                has_rationale = False
                check_lines = 10
                for j in range(i+1, min(i+1+check_lines, len(lines))):
                    if '**Rationale**:' in lines[j]:
                        has_rationale = True
                        break
                    if lines[j].startswith('### REQ-') or lines[j].startswith('## '):
                        break  # Hit next section

                # If no rationale, add one after the SHALL statement
                if not has_rationale:
                    # Skip to find the SHALL statement
                    i += 1
                    while i < len(lines):
                        new_lines.append(lines[i])
                        if 'SHALL' in lines[i]:
                            # Add blank line and rationale after SHALL statement
                            i += 1
                            new_lines.append('')
                            rationale = generate_rationale(req_id, req_title)
                            new_lines.append(f'**Rationale**: {rationale}')
                            changes_made += 1
                            break
                        i += 1

        i += 1

    # Write back if changes were made
    if changes_made > 0:
        with open(filename, 'w') as f:
            f.write('\n'.join(new_lines))
        print(f"  Added {changes_made} rationales")
    else:
        print(f"  No changes needed")

print("\n✅ Completed adding rationales to all requirements!")
