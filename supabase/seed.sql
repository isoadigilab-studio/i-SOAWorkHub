-- OPTIONAL: clearly-marked DEMO listings so the site is not empty before real clients post.
-- They have no owner, cannot receive applications, and carry no budget. Delete them any time:
--   delete from public.opportunities where is_demo;
insert into public.opportunities (category_id, title, slug, description, company_name, opportunity_type, work_mode, status, is_demo, published_at, skills)
select c.id, d.title, d.slug, d.description, 'DEMO — not a real company', d.otype::public.opportunity_type, 'remote', 'published', true, now(), d.skills
from (values
  ('graphic-design', '[DEMO] Logo and brand kit for a small business', 'demo-logo-brand-kit', 'Demonstration listing only. This is not a real job offer; it shows how a freelance design project appears on i-SOA WorkHub.', 'freelance', array['illustrator','photoshop']),
  ('web-development', '[DEMO] Business website with contact form', 'demo-business-website', 'Demonstration listing only. This is not a real job offer; it shows how a web development project appears on i-SOA WorkHub.', 'freelance', array['html','css','javascript']),
  ('social-media-management', '[DEMO] Social media content calendar', 'demo-social-media-calendar', 'Demonstration listing only. This is not a real job offer; it shows how a social media project appears on i-SOA WorkHub.', 'part_time', array['social media','canva']),
  ('virtual-assistant', '[DEMO] Part-time virtual assistant', 'demo-virtual-assistant', 'Demonstration listing only. This is not a real job offer; it shows how a virtual assistant role appears on i-SOA WorkHub.', 'part_time', array['excel','customer support']),
  ('translation', '[DEMO] French–Malagasy document translation', 'demo-translation', 'Demonstration listing only. This is not a real job offer; it shows how a translation project appears on i-SOA WorkHub.', 'freelance', array['translation']),
  ('video-editing', '[DEMO] Short promotional video edit', 'demo-video-edit', 'Demonstration listing only. This is not a real job offer; it shows how a video editing project appears on i-SOA WorkHub.', 'freelance', array['video editing','premiere pro'])
) as d(cat, title, slug, description, otype, skills)
join public.categories c on c.slug = d.cat
on conflict (slug) do nothing;
